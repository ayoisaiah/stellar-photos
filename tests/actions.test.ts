import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset } from "../src/ts/assets";
import type { ImageSource } from "../src/ts/sources";

const deleteCachedImage = vi.fn();
const putCachedImage = vi.fn();
const readCachedImage = vi.fn();
const readHistory = vi.fn();
const writeHistory = vi.fn();
const getActiveImageSources = vi.fn();
const getImageSource = vi.fn();
const readPinnedAsset = vi.fn();
const writePinnedAsset = vi.fn();
const createThumbnail = vi.fn().mockResolvedValue(null);
const coreStore = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("../src/ts/settings", () => ({
  coreStore,
}));
vi.mock("../src/ts/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/ts/cache")>()),
  createThumbnail,
  deleteCachedImage,
  putCachedImage,
  readCachedImage,
}));
vi.mock("../src/ts/sources", () => ({
  getActiveImageSources,
  getImageSource,
}));
vi.mock("../src/ts/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/ts/storage")>()),
  HISTORY_LIMIT: 10,
  readHistory,
  writeHistory,
  readPinnedAsset,
  writePinnedAsset,
}));

let fakeStorage: Record<string, unknown> = {};

const defaultStorageGet = async (key: string | string[]) => {
  const result: Record<string, unknown> = { ...fakeStorage };
  if (result.stellarPinned === undefined) {
    const pinned = await readPinnedAsset();
    if (pinned !== undefined) result.stellarPinned = pinned;
  }
  if (result.stellarHistory === undefined) {
    const historyState = await readHistory();
    if (historyState !== undefined) result.stellarHistory = historyState;
  }
  if (Array.isArray(key)) {
    return Object.fromEntries(key.map((k) => [k, result[k]]));
  }
  return { [key]: result[key] };
};

const defaultStorageSet = async (items: Record<string, unknown>) => {
  fakeStorage = { ...fakeStorage, ...items };
};

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(defaultStorageGet),
      set: vi.fn(defaultStorageSet),
    },
  },
});

const { nextImage, trackDownload } = await import("../src/ts/actions");
const { SOURCE_HEALTH_STORAGE_KEY } = await import(
  "../src/ts/sources/source-health"
);

const candidate = {
  sourceId: "unsplash",
  sourceAssetId: "photo-2",
  width: 1600,
  height: 900,
  color: null,
  description: null,
  attribution: null,
  sourcePayload: {},
  createdAt: 2,
};
const current: BackgroundAsset = {
  ...candidate,
  sourceAssetId: "photo-1",
  cacheKey: "cache-1",
  createdAt: 1,
};
const prepared: BackgroundAsset = {
  ...candidate,
  cacheKey: "https://cache.stellar-photos.invalid/asset/unsplash/photo-2",
};

let source: ImageSource;

beforeEach(() => {
  vi.resetAllMocks();
  fakeStorage = {};
  createThumbnail.mockResolvedValue(null);
  source = {
    id: "unsplash",
    name: "Unsplash",
    description: "High quality photos",
    getRandomAsset: vi.fn().mockResolvedValue(candidate),
    downloadAsset: vi
      .fn()
      .mockResolvedValue(new Blob(["image"], { type: "image/jpeg" })),
  };
  getImageSource.mockReturnValue(source);
  getActiveImageSources.mockResolvedValue([source]);
  coreStore.get.mockResolvedValue({
    version: 1,
    activeSourceIds: ["unsplash"],
    photoFrequency: "newtab",
  });
  deleteCachedImage.mockResolvedValue(true);
  putCachedImage.mockResolvedValue(undefined);
  readCachedImage.mockResolvedValue(new Response("image"));
  readHistory.mockResolvedValue({ history: [current] });
  writeHistory.mockResolvedValue(undefined);
  writePinnedAsset.mockResolvedValue(undefined);
  readPinnedAsset.mockResolvedValue(null);
});

describe("source activation and multi-source rotation", () => {
  it("fetches a new image when current photo source is no longer active", async () => {
    const earthviewSource: ImageSource = {
      id: "earthview",
      name: "Google Earth View",
      description: "Satellite imagery",
      getRandomAsset: vi.fn().mockResolvedValue({
        ...candidate,
        sourceId: "earthview",
        sourceAssetId: "earth-1",
      }),
      downloadAsset: vi
        .fn()
        .mockResolvedValue(new Blob(["image"], { type: "image/jpeg" })),
    };
    getActiveImageSources.mockResolvedValue([earthviewSource]);

    await expect(nextImage()).resolves.toBeUndefined();
    expect(writeHistory).toHaveBeenCalledWith({
      history: [
        expect.objectContaining({
          sourceId: "earthview",
          sourceAssetId: "earth-1",
        }),
        current,
      ],
    });

    expect(earthviewSource.getRandomAsset).toHaveBeenCalledOnce();
  });

  it("skips rotation on newtab when current photo is fresh and frequency is hourly", async () => {
    coreStore.get.mockResolvedValue({
      version: 1,
      activeSourceIds: ["unsplash"],
      photoFrequency: "everyhour",
    });
    const freshAsset = { ...current, createdAt: Date.now() };
    readHistory.mockResolvedValue({ history: [freshAsset] });

    await expect(nextImage()).resolves.toBeUndefined();

    expect(source.getRandomAsset).not.toHaveBeenCalled();
  });

  it("rotates when frequency expires", async () => {
    coreStore.get.mockResolvedValue({
      version: 1,
      activeSourceIds: ["unsplash"],
      photoFrequency: "every15minutes",
    });
    const oldAsset = { ...current, createdAt: Date.now() - 20 * 60 * 1000 };
    readHistory.mockResolvedValue({ history: [oldAsset] });

    await expect(nextImage()).resolves.toBeUndefined();

    expect(source.getRandomAsset).toHaveBeenCalledOnce();
  });

  it("rotates when rotation is explicitly triggered", async () => {
    await expect(nextImage()).resolves.toBeUndefined();

    expect(source.getRandomAsset).toHaveBeenCalledOnce();
    expect(writeHistory).toHaveBeenCalledWith({
      history: [prepared, current],
    });
  });

  it("falls back to another active source if the first source fails", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const failingSource: ImageSource = {
      id: "local",
      name: "Local folder",
      description: "Local photos",
      getRandomAsset: vi.fn().mockRejectedValue(new Error("Folder empty")),
      downloadAsset: vi.fn(),
    };
    getActiveImageSources.mockResolvedValue([failingSource, source]);

    await expect(nextImage()).resolves.toBeUndefined();
    expect(failingSource.getRandomAsset).toHaveBeenCalled();
    expect(source.getRandomAsset).toHaveBeenCalled();
  });

  it("finishes caching an in-progress download when a photo becomes pinned", async () => {
    vi.mocked(source.downloadAsset).mockImplementation(async () => {
      readPinnedAsset.mockResolvedValue(current);
      return new Blob(["image"], { type: "image/jpeg" });
    });

    await expect(nextImage()).resolves.toBeUndefined();

    expect(source.downloadAsset).toHaveBeenCalledWith(candidate);
    expect(putCachedImage).toHaveBeenCalledWith(
      prepared.cacheKey,
      expect.any(Response),
    );
    expect(writeHistory).toHaveBeenCalledWith({ history: [prepared, current] });
    expect(writePinnedAsset).not.toHaveBeenCalled();
  });

  it("notifies the source when tracking a user download for a supported source", async () => {
    const didDownload = vi.fn().mockResolvedValue(undefined);
    getImageSource.mockReturnValue({
      ...source,
      didDownload,
    });

    await trackDownload(current);

    expect(didDownload).toHaveBeenCalledWith(current);
  });

  it("handles missing didDownload without error", async () => {
    getImageSource.mockReturnValue({
      ...source,
      didDownload: undefined,
    });

    await expect(trackDownload(current)).resolves.toBeUndefined();
  });

  it("serializes concurrent nextImage requests", async () => {
    let history = [current];
    readHistory.mockImplementation(async () => ({ history: [...history] }));
    writeHistory.mockImplementation(async (state) => {
      history = state.history;
    });

    const [first, second] = await Promise.all([nextImage(), nextImage()]);

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(source.getRandomAsset).toHaveBeenCalledTimes(2);
    expect(history).toEqual([prepared, prepared, current]);
  });

  it("stops when pinned without reading the image cache or clearing the pin", async () => {
    readPinnedAsset.mockResolvedValue(current);

    await expect(nextImage()).resolves.toBeUndefined();
    expect(readCachedImage).not.toHaveBeenCalled();
    expect(writePinnedAsset).not.toHaveBeenCalled();
    expect(source.getRandomAsset).not.toHaveBeenCalled();
  });

  it("waits for the deadline even if the image is missing and its source is disabled", async () => {
    coreStore.get.mockResolvedValue({
      version: 1,
      activeSourceIds: ["unsplash"],
      photoFrequency: "everyhour",
    });
    readHistory.mockResolvedValue({
      history: [{ ...current, createdAt: Date.now() }],
    });
    readCachedImage.mockResolvedValue(undefined);
    getActiveImageSources.mockResolvedValue([]);

    await expect(nextImage()).resolves.toBeUndefined();
    expect(readCachedImage).not.toHaveBeenCalled();
    expect(getActiveImageSources).not.toHaveBeenCalled();
    expect(source.downloadAsset).not.toHaveBeenCalled();
  });

  it("allows the next request to proceed after a failed download", async () => {
    vi.mocked(source.downloadAsset).mockRejectedValueOnce(new Error("Offline"));

    await expect(nextImage()).rejects.toThrow("Offline");
    await expect(nextImage()).resolves.toBeUndefined();
  });

  it("generates and caches thumbnail derivative when image is rotated", async () => {
    const fakeThumbBlob = new Blob(["fake-webp"], { type: "image/webp" });
    createThumbnail.mockResolvedValueOnce({
      blob: fakeThumbBlob,
      width: 1920,
      height: 1080,
    });

    await expect(nextImage()).resolves.toBeUndefined();

    expect(createThumbnail).toHaveBeenCalled();
    expect(putCachedImage).toHaveBeenCalledWith(
      prepared.cacheKey,
      expect.any(Response),
      "thumbnail",
    );
  });

  it("deletes cached image and thumbnail of evicted history item when history limit is exceeded", async () => {
    const tenItems: BackgroundAsset[] = Array.from({ length: 10 }, (_, i) => ({
      ...candidate,
      sourceAssetId: `photo-old-${i}`,
      cacheKey: `cache-old-${i}`,
      createdAt: i,
    }));
    readHistory.mockResolvedValue({ history: tenItems });

    await expect(nextImage()).resolves.toBeUndefined();

    expect(deleteCachedImage).toHaveBeenCalledWith("cache-old-9");
    expect(deleteCachedImage).toHaveBeenCalledWith("cache-old-9", "thumbnail");
  });

  it("does not delete cached thumbnail if duplicate cacheKey remains in history after eviction", async () => {
    const tenItems: BackgroundAsset[] = Array.from({ length: 10 }, (_, i) => ({
      ...candidate,
      sourceAssetId: `photo-old-${i}`,
      cacheKey: i === 9 ? "shared-cache-key" : `cache-old-${i}`,
      createdAt: i,
    }));
    tenItems[0] = { ...tenItems[0]!, cacheKey: "shared-cache-key" };

    readHistory.mockResolvedValue({ history: tenItems });

    await expect(nextImage()).resolves.toBeUndefined();

    expect(deleteCachedImage).not.toHaveBeenCalledWith("shared-cache-key");
    expect(deleteCachedImage).not.toHaveBeenCalledWith(
      "shared-cache-key",
      "thumbnail",
    );
  });
});

describe("source status reporting without behavior changes", () => {
  it("keeps failed sources in normal rotation alongside healthy sources", async () => {
    fakeStorage[SOURCE_HEALTH_STORAGE_KEY] = {
      unsplash: "Couldn’t connect",
    };

    const earthviewSource: ImageSource = {
      id: "earthview",
      name: "Google Earth View",
      description: "Satellite imagery",
      getRandomAsset: vi.fn().mockResolvedValue({
        ...candidate,
        sourceId: "earthview",
        sourceAssetId: "earth-1",
      }),
      downloadAsset: vi
        .fn()
        .mockResolvedValue(new Blob(["image"], { type: "image/jpeg" })),
    };

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    getActiveImageSources.mockResolvedValue([source, earthviewSource]);

    await expect(nextImage()).resolves.toBeUndefined();

    expect(source.getRandomAsset).toHaveBeenCalledOnce();
    expect(earthviewSource.getRandomAsset).not.toHaveBeenCalled();
  });

  it("clears the warning on the next successful normal request", async () => {
    fakeStorage[SOURCE_HEALTH_STORAGE_KEY] = {
      unsplash: "Couldn’t connect",
    };

    getActiveImageSources.mockResolvedValue([source]);

    await expect(nextImage()).resolves.toBeUndefined();

    expect(source.getRandomAsset).toHaveBeenCalledOnce();

    const healthMap = fakeStorage[SOURCE_HEALTH_STORAGE_KEY] as Record<
      string,
      string
    >;
    expect(healthMap.unsplash).toBeUndefined();
  });

  it("does not mark source as failed when caching or storage throws", async () => {
    putCachedImage.mockRejectedValueOnce(
      new Error("Disk full / Quota exceeded"),
    );

    await expect(nextImage()).rejects.toThrow("Disk full / Quota exceeded");

    expect(source.getRandomAsset).toHaveBeenCalledOnce();

    const healthMap = (fakeStorage[SOURCE_HEALTH_STORAGE_KEY] ?? {}) as Record<
      string,
      string
    >;
    expect(healthMap.unsplash).toBeUndefined();
  });

  it.each([
    new Error("Network timeout"),
    new Error("Request failed: https://example.com?api_key=test-key"),
    "Raw failure text",
  ])("preserves the raw failure message: %s", async (error) => {
    source.getRandomAsset = vi.fn().mockRejectedValueOnce(error);

    await expect(nextImage()).rejects.toBe(error);

    const healthMap = fakeStorage[SOURCE_HEALTH_STORAGE_KEY] as Record<
      string,
      string
    >;
    expect(healthMap.unsplash).toBe(
      error instanceof Error ? error.message : error,
    );
  });

  it.each(["get", "set"] as const)(
    "ignores status storage %s failures",
    async (operation) => {
      fakeStorage[SOURCE_HEALTH_STORAGE_KEY] = { unsplash: "Timed out" };
      const original = vi.mocked(chrome.storage.local[operation]);
      original.mockImplementation(async (arg: unknown) => {
        if (
          arg === SOURCE_HEALTH_STORAGE_KEY ||
          (typeof arg === "object" &&
            arg !== null &&
            SOURCE_HEALTH_STORAGE_KEY in arg)
        ) {
          original.mockImplementation(
            operation === "get"
              ? (defaultStorageGet as never)
              : (defaultStorageSet as never),
          );
          throw new Error("Status storage unavailable");
        }
        return operation === "get"
          ? defaultStorageGet(arg as string | string[])
          : defaultStorageSet(arg as Record<string, unknown>);
      });

      await expect(nextImage()).resolves.toBeUndefined();
      expect(writeHistory).toHaveBeenCalled();
    },
  );

  it("propagates history errors without marking the source as failed", async () => {
    writeHistory.mockRejectedValueOnce(new Error("History unavailable"));

    await expect(nextImage()).rejects.toThrow("History unavailable");
    expect(fakeStorage[SOURCE_HEALTH_STORAGE_KEY] ?? {}).toEqual({});
  });

  it("preserves fallback after a cache failure", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const fallback = {
      ...source,
      id: "earthview",
      getRandomAsset: vi
        .fn()
        .mockResolvedValue({ ...candidate, sourceId: "earthview" }),
    };
    getActiveImageSources.mockResolvedValue([source, fallback]);
    putCachedImage.mockRejectedValueOnce(new Error("Cache write failed"));

    await expect(nextImage()).resolves.toBeUndefined();
    expect(fallback.getRandomAsset).toHaveBeenCalledOnce();
    expect(fakeStorage[SOURCE_HEALTH_STORAGE_KEY] ?? {}).toEqual({});
  });
});

it("visits every source once with uniformly shuffled orders", async () => {
  const order: string[] = [];
  const sources: ImageSource[] = ["a", "b", "c", "d"].map((id) => ({
    ...source,
    id,
    getRandomAsset: async () => {
      order.push(id);
      throw new Error("Unavailable");
    },
  }));
  getActiveImageSources.mockResolvedValue(sources);
  const random = vi.spyOn(Math, "random");
  const orders = new Set<string>();

  try {
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 3; b++) {
        for (let c = 0; c < 2; c++) {
          order.length = 0;
          random.mockReset().mockReturnValue(0);
          random
            .mockReturnValueOnce(a / 4)
            .mockReturnValueOnce(b / 3)
            .mockReturnValueOnce(c / 2);

          await expect(nextImage()).rejects.toThrow("Unavailable");
          expect(order).toHaveLength(4);
          expect(new Set(order).size).toBe(4);
          orders.add(order.join(""));
        }
      }
    }

    expect(orders.size).toBe(24);
  } finally {
    random.mockRestore();
  }
});
