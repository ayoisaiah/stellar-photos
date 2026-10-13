import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset } from "../src/ts/assets";
import type { ImageSource } from "../src/ts/sources";

const putCachedImage = vi.fn();
const readHistory = vi.fn();
const writeHistory = vi.fn();
const getActiveImageSources = vi.fn();
const getImageSource = vi.fn();
const readPinnedAsset = vi.fn();
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
  putCachedImage,
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

const { nextImage } = await import("../src/ts/actions");
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
    fetchRandom: vi.fn().mockResolvedValue({
      asset: candidate,
      blob: new Blob(["image"], { type: "image/jpeg" }),
    }),
  };
  getImageSource.mockReturnValue(source);
  getActiveImageSources.mockResolvedValue([source]);
  coreStore.get.mockResolvedValue({
    version: 1,
    activeSourceIds: ["unsplash"],
    photoFrequency: "newtab",
  });
  putCachedImage.mockResolvedValue(undefined);
  readHistory.mockResolvedValue({ history: [current] });
  writeHistory.mockResolvedValue(undefined);
  readPinnedAsset.mockResolvedValue(null);
});

describe("nextImage core invariants", () => {
  it("serializes concurrent nextImage requests", async () => {
    let history = [current];
    readHistory.mockImplementation(async () => ({ history: [...history] }));
    writeHistory.mockImplementation(async (state) => {
      history = state.history;
    });

    const [first, second] = await Promise.all([nextImage(), nextImage()]);

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(source.fetchRandom).toHaveBeenCalledTimes(2);
    expect(history).toEqual([prepared, prepared, current]);
  });

  it("does not mark source as failed when caching or storage throws", async () => {
    putCachedImage.mockRejectedValueOnce(
      new Error("Disk full / Quota exceeded"),
    );

    await expect(nextImage()).rejects.toThrow("Disk full / Quota exceeded");

    expect(source.fetchRandom).toHaveBeenCalledOnce();

    const healthMap = (fakeStorage[SOURCE_HEALTH_STORAGE_KEY] ?? {}) as Record<
      string,
      string
    >;
    expect(healthMap.unsplash).toBeUndefined();
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
});
