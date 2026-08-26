// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addDirectoryHandle,
  clearLocalDb,
  getLocalMeta,
  getLocalPhotoCount,
  getRandomDirectoryImage,
  isImageFileName,
  listDirectoryImageNames,
  listStoredFolderRecords,
  readDirectoryFile,
  removeDirectoryHandle,
  rescanAllFolders,
  RESCAN_INTERVAL_MS,
  saveDirectoryHandle,
} from "../src/ts/sources/local-db";
import { localSource } from "../src/ts/sources/local";
import {
  DEFAULT_LOCAL_SETTINGS,
  getLocalPhotoFrequency,
  getLocalSettings,
  initializeLocalSettings,
  LOCAL_SETTINGS_KEY,
  setLocalPhotoFrequency,
  setLocalSettings,
} from "../src/ts/sources/local-settings";

import type { BackgroundAsset } from "../src/ts/types";

const sync: Record<string, unknown> = {};

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
  } as unknown as FileSystemDirectoryHandle;
}

const dbStores = new Map<string, Map<string, unknown>>();
let currentDbVersion = 0;

const mockIdb = {
  open(_name: string, version: number) {
    const isUpgrade = version > currentDbVersion;
    const oldVersion = currentDbVersion;
    if (isUpgrade) {
      currentDbVersion = version;
    }

    const req = {
      result: {
        objectStoreNames: {
          contains: (storeName: string) => dbStores.has(storeName),
        },
        createObjectStore: (storeName: string) => {
          if (!dbStores.has(storeName)) dbStores.set(storeName, new Map());
        },
        deleteObjectStore: (storeName: string) => {
          dbStores.delete(storeName);
        },
        transaction: (_storeNames: string | string[]) => {
          return {
            objectStore: (storeName: string) => {
              if (!dbStores.has(storeName)) dbStores.set(storeName, new Map());
              const map = dbStores.get(storeName)!;

              return {
                clear: () => {
                  map.clear();
                },
                put: (val: Record<string, unknown>) => {
                  const key = (val.id ?? val.key) as string;
                  map.set(key, val);
                },
                get: (key: string) => {
                  const getReq = {
                    result: map.get(key),
                    onsuccess: null as ((ev?: unknown) => void) | null,
                    onerror: null as ((ev?: unknown) => void) | null,
                  };
                  queueMicrotask(() => getReq.onsuccess?.());
                  return getReq;
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
                },
                count: () => {
                  const countReq = {
                    result: map.size,
                    onsuccess: null as ((ev?: unknown) => void) | null,
                    onerror: null as ((ev?: unknown) => void) | null,
                  };
                  queueMicrotask(() => countReq.onsuccess?.());
                  return countReq;
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
        req.onupgradeneeded?.({
          oldVersion,
        } as unknown as IDBVersionChangeEvent);
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
          callback: (result: Record<string, unknown>) => void,
        ) => {
          const selected =
            keys === null
              ? sync
              : Object.fromEntries(
                  (Array.isArray(keys) ? keys : [keys])
                    .filter((key) => key in sync)
                    .map((key) => [key, sync[key]]),
                );
          callback(selected);
        },
        set: (data: Record<string, unknown>, callback: () => void) => {
          Object.assign(sync, data);
          callback();
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

    const count = await saveDirectoryHandle(handle);
    expect(count).toBe(5);

    const meta = await getLocalMeta();
    expect(meta).toMatchObject({
      key: "folder",
      folderName: "Wallpapers",
      photoCount: 5,
    });

    expect(await getLocalPhotoCount()).toBe(5);

    const imagePaths = await listDirectoryImageNames(handle);
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

    await clearLocalDb();
    expect(await getLocalPhotoCount()).toBe(0);
    expect(await getLocalMeta()).toBeNull();
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
    expect(await getLocalPhotoCount()).toBe(4);

    const stored = await listStoredFolderRecords();
    expect(stored).toHaveLength(2);
    expect(stored.map((f) => f.folderName)).toEqual(["FolderA", "FolderB"]);

    const random = await getRandomDirectoryImage();
    expect(random).not.toBeNull();
    expect(["a1.jpg", "a2.png", "b1.webp", "b2.jpg"]).toContain(random?.name);

    await removeDirectoryHandle(record1.id);
    expect(await getLocalPhotoCount()).toBe(2);
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
    expect(await getLocalPhotoCount()).toBe(2);
  });

  it("throws when saving a folder with no valid image files", async () => {
    const handle = createMockDirHandle("Empty", {
      "doc.pdf": "pdf-content",
    });

    await expect(saveDirectoryHandle(handle)).rejects.toThrow(
      "No image files found in the selected folder",
    );
  });
});

describe("local source settings", () => {
  it("defaults settings and allows updates", async () => {
    await initializeLocalSettings();
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
    await saveDirectoryHandle(handle);

    const asset = await localSource.getRandomAsset();
    expect(asset).toMatchObject({
      sourceId: "local",
      description: "stars.jpg",
      width: 1920,
      height: 1080,
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
});
