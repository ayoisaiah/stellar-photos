// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearLocalDb,
  getLocalMeta,
  getLocalPhotoCount,
  getRandomDirectoryImage,
  isImageFileName,
  listDirectoryImageNames,
  readDirectoryFile,
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

function createMockIdb() {
  const stores = new Map<string, Map<string, unknown>>();

  return {
    open(_name: string, _version: number) {
      const req = {
        result: {
          objectStoreNames: {
            contains: (storeName: string) => stores.has(storeName),
          },
          createObjectStore: (storeName: string) => {
            if (!stores.has(storeName)) stores.set(storeName, new Map());
          },
          deleteObjectStore: (storeName: string) => {
            stores.delete(storeName);
          },
          transaction: (_storeNames: string | string[]) => {
            return {
              objectStore: (storeName: string) => {
                if (!stores.has(storeName)) stores.set(storeName, new Map());
                const map = stores.get(storeName)!;

                return {
                  clear: () => {
                    map.clear();
                  },
                  put: (val: Record<string, unknown>) => {
                    const key = (val.key ?? val.id) as string;
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
        req.onupgradeneeded?.({
          oldVersion: 0,
        } as unknown as IDBVersionChangeEvent);
        req.onsuccess?.();
      });

      return req;
    },
  };
}

function createMockDirHandle(name: string, files: Record<string, string>) {
  return {
    kind: "directory" as const,
    name,
    async *entries() {
      for (const fileName of Object.keys(files)) {
        yield [
          fileName,
          {
            kind: "file" as const,
            name: fileName,
            getFile: async () =>
              new File([files[fileName]!], fileName, { type: "image/jpeg" }),
          },
        ];
      }
    },
    async getFileHandle(fileName: string) {
      if (!(fileName in files)) {
        throw new Error("File not found");
      }

      return {
        kind: "file" as const,
        name: fileName,
        getFile: async () =>
          new File([files[fileName]!], fileName, { type: "image/jpeg" }),
      };
    },
  } as unknown as FileSystemDirectoryHandle;
}

const mockIdb = createMockIdb();

beforeEach(() => {
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
    });

    const count = await saveDirectoryHandle(handle);
    expect(count).toBe(2);

    const meta = await getLocalMeta();
    expect(meta).toMatchObject({
      key: "folder",
      folderName: "Wallpapers",
      photoCount: 2,
    });

    expect(await getLocalPhotoCount()).toBe(2);

    const imageNames = await listDirectoryImageNames(handle);
    expect(imageNames).toEqual(["nature.jpg", "space.png"]);

    const random = await getRandomDirectoryImage();
    expect(random).not.toBeNull();
    expect(["nature.jpg", "space.png"]).toContain(random?.name);

    const file = await readDirectoryFile("nature.jpg");
    expect(await file.text()).toBe("data1");

    await clearLocalDb();
    expect(await getLocalPhotoCount()).toBe(0);
    expect(await getLocalMeta()).toBeNull();
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
