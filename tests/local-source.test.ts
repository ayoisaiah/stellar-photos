import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import { computeLocalAssetId, localSource } from "../src/ts/sources/local";
import {
  addDirectoryHandle,
  getRandomDirectoryImage,
  isImageFileName,
  listDirectoryImagePaths,
  listStoredFolderRecords,
  readDirectoryFile,
  removeDirectoryHandle,
  rescanAllFolders,
} from "../src/ts/sources/local-db";
import {
  DEFAULT_LOCAL_SETTINGS,
  getLocalPhotoFrequency,
  getLocalSettings,
  LOCAL_SETTINGS_KEY,
  setLocalPhotoFrequency,
  setLocalSettings,
} from "../src/ts/sources/local-settings";

const sync: Record<string, unknown> = {};

async function localPhotoCount(): Promise<number> {
  return (await listStoredFolderRecords()).reduce(
    (sum, record) => sum + record.photoCount,
    0,
  );
}

type MockDirStructure = {
  [name: string]: string | MockDirStructure;
};

function createMockDirHandle(
  name: string,
  structure: MockDirStructure,
): FileSystemDirectoryHandle {
  return {
    kind: "directory" as const,
    name,
    async *entries() {
      for (const [entryName, value] of Object.entries(structure)) {
        if (typeof value === "string") {
          yield [
            entryName,
            {
              kind: "file" as const,
              name: entryName,
              getFile: async () =>
                new File([value], entryName, { type: "image/jpeg" }),
            },
          ];
        } else {
          yield [entryName, createMockDirHandle(entryName, value)];
        }
      }
    },
    async getFileHandle(fileName: string) {
      const val = structure[fileName];
      if (typeof val !== "string") {
        throw new Error(`File ${fileName} not found`);
      }

      return {
        kind: "file" as const,
        name: fileName,
        getFile: async () => new File([val], fileName, { type: "image/jpeg" }),
      };
    },
    async getDirectoryHandle(dirName: string) {
      const val = structure[dirName];
      if (!val || typeof val === "string") {
        throw new Error(`Directory ${dirName} not found`);
      }

      return createMockDirHandle(dirName, val);
    },
    async queryPermission() {
      return "granted";
    },
    async requestPermission() {
      return "granted";
    },
  } as unknown as FileSystemDirectoryHandle;
}

const dbStores = new Map<string, Map<string, unknown>>();
let currentDbVersion = 0;

const mockIdb = {
  open(_name: string, version: number) {
    const isUpgrade = version > currentDbVersion;
    if (isUpgrade) {
      currentDbVersion = version;
    }

    const req = {
      result: {
        createObjectStore: (storeName: string) => {
          if (!dbStores.has(storeName)) dbStores.set(storeName, new Map());
        },
        close: vi.fn(),
        transaction: (_storeNames: string | string[]) => {
          return {
            objectStore: (storeName: string) => {
              if (!dbStores.has(storeName)) dbStores.set(storeName, new Map());
              const map = dbStores.get(storeName)!;

              return {
                put: (val: Record<string, unknown>) => {
                  const key = (val.id ?? val.key) as string;
                  map.set(key, val);
                  return { result: key };
                },
                getAll: () => {
                  const getAllReq = {
                    result: Array.from(map.values()),
                    onsuccess: null as ((ev?: unknown) => void) | null,
                    onerror: null as ((ev?: unknown) => void) | null,
                  };
                  queueMicrotask(() => getAllReq.onsuccess?.());
                  return getAllReq;
                },
                delete: (key: string) => {
                  map.delete(key);
                  return { result: undefined };
                },
              };
            },
            set oncomplete(cb: () => void) {
              queueMicrotask(cb);
            },
            set onerror(_cb: () => void) {
              // mock error handler
            },
            set onabort(_cb: () => void) {
              // mock abort handler
            },
          };
        },
      },
      onsuccess: null as ((ev?: unknown) => void) | null,
      onerror: null as ((ev?: unknown) => void) | null,
      onupgradeneeded: null as ((ev?: unknown) => void) | null,
    };

    queueMicrotask(() => {
      if (isUpgrade) {
        req.onupgradeneeded?.();
      }
      req.onsuccess?.();
    });

    return req;
  },
};

beforeEach(() => {
  dbStores.clear();
  currentDbVersion = 0;
  for (const key of Object.keys(sync)) delete sync[key];

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      close: vi.fn(),
    }),
  );
  vi.stubGlobal("indexedDB", mockIdb);
  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      sync: {
        get: (
          keys: string | string[] | null,
          callback?: (result: Record<string, unknown>) => void,
        ) => {
          const selected =
            keys === null
              ? sync
              : Object.fromEntries(
                  (Array.isArray(keys) ? keys : [keys])
                    .filter((key) => key in sync)
                    .map((key) => [key, sync[key]]),
                );
          if (callback) callback(selected);
          return Promise.resolve(selected);
        },
        set: (data: Record<string, unknown>, callback?: () => void) => {
          Object.assign(sync, data);
          if (callback) callback();
          return Promise.resolve();
        },
      },
    },
  });
});

describe("local image file detection", () => {
  it("recognizes common photo extensions", () => {
    expect(isImageFileName("photo.jpg")).toBe(true);
    expect(isImageFileName("photo.png")).toBe(true);
    expect(isImageFileName("photo.webp")).toBe(true);
    expect(isImageFileName("photo.avif")).toBe(true);
    expect(isImageFileName("animation.gif")).toBe(false);
    expect(isImageFileName("graphic.bmp")).toBe(false);
    expect(isImageFileName("vector.svg")).toBe(false);
    expect(isImageFileName("document.pdf")).toBe(false);
    expect(isImageFileName("notes.txt")).toBe(false);
  });
});

describe("directory handle storage", () => {
  it("saves directory handle and reads image metadata directly", async () => {
    const handle = createMockDirHandle("Wallpapers", {
      "nature.jpg": "data1",
      "space.png": "data2",
      "doc.pdf": "doc",
      Vacation: {
        "beach.jpg": "beach-data",
        "mountain.webp": "mountain-data",
        Nested: {
          "sunset.jpg": "sunset-data",
        },
      },
      ".hidden": {
        "hidden.jpg": "hidden-data",
      },
    });

    const record = await addDirectoryHandle(handle);
    expect(record).toMatchObject({
      folderName: "Wallpapers",
      photoCount: 5,
    });

    expect(await localPhotoCount()).toBe(5);

    const imagePaths = await listDirectoryImagePaths(handle);
    expect(imagePaths).toEqual([
      "nature.jpg",
      "space.png",
      "Vacation/beach.jpg",
      "Vacation/mountain.webp",
      "Vacation/Nested/sunset.jpg",
    ]);

    const random = await getRandomDirectoryImage();
    expect(random).not.toBeNull();
    expect([
      "nature.jpg",
      "space.png",
      "beach.jpg",
      "mountain.webp",
      "sunset.jpg",
    ]).toContain(random?.name);

    const file = await readDirectoryFile("Vacation/beach.jpg");
    expect(await file.text()).toBe("beach-data");
  });

  it("supports adding and removing multiple directory handles", async () => {
    const handle1 = createMockDirHandle("FolderA", {
      "a1.jpg": "data-a1",
      "a2.png": "data-a2",
    });
    const handle2 = createMockDirHandle("FolderB", {
      "b1.webp": "data-b1",
      Sub: {
        "b2.jpg": "data-b2",
      },
    });

    const record1 = await addDirectoryHandle(handle1);
    const record2 = await addDirectoryHandle(handle2);

    expect(record1.photoCount).toBe(2);
    expect(record2.photoCount).toBe(2);
    expect(await localPhotoCount()).toBe(4);

    const stored = await listStoredFolderRecords();
    expect(stored).toHaveLength(2);
    expect(stored.map((f) => f.folderName)).toEqual(["FolderA", "FolderB"]);

    const random = await getRandomDirectoryImage();
    expect(random).not.toBeNull();
    expect(["a1.jpg", "a2.png", "b1.webp", "b2.jpg"]).toContain(random?.name);

    await removeDirectoryHandle(record1.id);
    expect(await localPhotoCount()).toBe(2);
    const remaining = await listStoredFolderRecords();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.folderName).toBe("FolderB");
  });

  it("rescans folders to discover newly added images", async () => {
    const structure: Record<string, string> = {
      "pic1.jpg": "data1",
    };
    const handle = createMockDirHandle("DynamicFolder", structure);
    const record = await addDirectoryHandle(handle);

    expect(record.photoCount).toBe(1);
    expect(record.imagePaths).toEqual(["pic1.jpg"]);

    // Add a new file to the mock directory
    structure["pic2.png"] = "data2";

    const updated = await rescanAllFolders();
    expect(updated).toHaveLength(1);
    expect(updated[0]?.photoCount).toBe(2);
    expect(updated[0]?.imagePaths).toEqual(["pic1.jpg", "pic2.png"]);
    expect(await localPhotoCount()).toBe(2);
  });

  it("throws when saving a folder with no valid image files", async () => {
    const handle = createMockDirHandle("Empty", {
      "doc.pdf": "pdf-content",
    });

    await expect(addDirectoryHandle(handle)).rejects.toThrow(
      "No image files found in the selected folder",
    );
  });

  it("selects random photos efficiently across multiple folders respecting exclusions", async () => {
    const structureA: Record<string, string> = {};
    const structureB: Record<string, string> = {};
    for (let i = 0; i < 50; i++) {
      structureA[`a_${i}.jpg`] = `data_a_${i}`;
      structureB[`b_${i}.jpg`] = `data_b_${i}`;
    }

    await addDirectoryHandle(createMockDirHandle("FolderA", structureA));
    await addDirectoryHandle(createMockDirHandle("FolderB", structureB));

    const allSelections = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const selected = await getRandomDirectoryImage();
      expect(selected).not.toBeNull();
      allSelections.add(selected!.relativePath);
    }
    expect(allSelections.size).toBeGreaterThan(1);

    // Test exclusions
    const excluded = ["a_0.jpg", "a_1.jpg", "a_2.jpg"];
    const pick = await getRandomDirectoryImage(excluded);
    expect(pick).not.toBeNull();
    expect(excluded).not.toContain(pick!.relativePath);
  });
});

describe("local source settings", () => {
  it("defaults settings and allows updates", async () => {
    expect(await getLocalSettings()).toEqual(DEFAULT_LOCAL_SETTINGS);

    await setLocalSettings({ folderName: "My Photos" });
    await setLocalPhotoFrequency("everyhour");

    expect(await getLocalSettings()).toEqual({
      version: 1,
      folderName: "My Photos",
      photoFrequency: "everyhour",
    });
    expect(await getLocalPhotoFrequency()).toBe("everyhour");
  });
});

describe("local source image rotation and retrieval", () => {
  it("retrieves a random asset directly from folder and downloads it", async () => {
    const handle = createMockDirHandle("Space", {
      "stars.jpg": "image-bytes",
    });
    await addDirectoryHandle(handle);

    const asset = await localSource.getRandomAsset();
    expect(asset).toMatchObject({
      sourceId: "local",
      description: "stars.jpg",
      width: 0,
      height: 0,
      payloadVersion: 1,
    });

    const response = await localSource.downloadAsset(asset);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(await response.text()).toBe("image-bytes");
  });

  it("determines rotation based on photoFrequency", async () => {
    const asset: BackgroundAsset = {
      sourceId: "local",
      sourceAssetId: "stars_jpg",
      cacheKey: "cache-1",
      width: 0,
      height: 0,
      color: null,
      description: "stars.jpg",
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: Date.now() - 20 * 60 * 1000,
    };

    expect(await localSource.shouldRotate?.(asset)).toBe(true);

    sync[LOCAL_SETTINGS_KEY] = {
      version: 1,
      photoFrequency: "everyhour",
      folderName: "Space",
    };

    expect(await localSource.shouldRotate?.(asset)).toBe(false);

    expect(
      await localSource.shouldRotate?.({
        ...asset,
        createdAt: Date.now() - 70 * 60 * 1000,
      }),
    ).toBe(true);
  });

  it("computes distinct deterministic asset IDs across folders with identical file names", async () => {
    const id1 = await computeLocalAssetId("folder-1", "wallpaper.jpg");
    const id2 = await computeLocalAssetId("folder-2", "wallpaper.jpg");
    const id1Duplicate = await computeLocalAssetId("folder-1", "wallpaper.jpg");

    expect(id1).not.toBe(id2);
    expect(id1).toBe(id1Duplicate);
    expect(id1.length).toBeLessThanOrEqual(60);
  });

  it("throws when readDirectoryFile targets a missing folderId", async () => {
    const handle = createMockDirHandle("FolderA", { "a.jpg": "content" });
    await addDirectoryHandle(handle);

    await expect(
      readDirectoryFile("a.jpg", "non-existent-folder-id"),
    ).rejects.toThrow("Target folder not found.");
  });

  it("gracefully falls back to other photos if one file on disk is deleted or unreadable", async () => {
    const handle = createMockDirHandle("TestFolder", {
      "deleted.jpg": "data",
      "valid.jpg": "valid content",
    });

    // Make deleted.jpg throw when getFile() is called
    const origGetFileHandle = handle.getFileHandle.bind(handle);
    handle.getFileHandle = async (name: string) => {
      if (name === "deleted.jpg") {
        throw new Error("NotFoundError: The file was deleted");
      }
      return origGetFileHandle(name);
    };

    await addDirectoryHandle(handle);

    const random = await getRandomDirectoryImage();
    expect(random).not.toBeNull();
    expect(random?.name).toBe("valid.jpg");

    const asset = await localSource.getRandomAsset();
    expect(asset.description).toBe("valid.jpg");
  });
});
