import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset } from "../src/ts/assets";
import type { ImageSource } from "../src/ts/sources";

const putCachedImage = vi.fn();
const writeHistory = vi.fn();
const getActiveImageSources = vi.fn();
const getImageSource = vi.fn();
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
  writeHistory,
}));

let fakeStorage: Record<string, unknown> = {};

const defaultStorageGet = async (key: string | string[]) => {
  if (Array.isArray(key)) {
    return Object.fromEntries(key.map((k) => [k, fakeStorage[k]]));
  }
  return { [key]: fakeStorage[key] };
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
  fakeStorage = {
    stellarHistory: { history: [current] },
    stellarPinned: null,
  };
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
  writeHistory.mockResolvedValue(undefined);
});

describe("nextImage core invariants", () => {
  it("serializes concurrent nextImage requests", async () => {
    let history = [current];
    writeHistory.mockImplementation(async (state) => {
      history = state.history;
      fakeStorage.stellarHistory = { history: [...history] };
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

  it("ignores status storage set failures", async () => {
    fakeStorage[SOURCE_HEALTH_STORAGE_KEY] = { unsplash: "Timed out" };
    const original = vi.mocked(chrome.storage.local.set);
    original.mockImplementation(async (arg: Record<string, unknown>) => {
      if (SOURCE_HEALTH_STORAGE_KEY in arg) {
        original.mockImplementation(defaultStorageSet as never);
        throw new Error("Status storage unavailable");
      }
      return defaultStorageSet(arg);
    });

    await expect(nextImage()).resolves.toBeUndefined();
    expect(writeHistory).toHaveBeenCalled();
  });

  it("propagates history errors without marking the source as failed", async () => {
    writeHistory.mockRejectedValueOnce(new Error("History unavailable"));

    await expect(nextImage()).rejects.toThrow("History unavailable");
    expect(fakeStorage[SOURCE_HEALTH_STORAGE_KEY] ?? {}).toEqual({});
  });

  it("reads local storage only once during image rotation", async () => {
    fakeStorage[SOURCE_HEALTH_STORAGE_KEY] = { unsplash: "Timed out" };
    const getSpy = vi.spyOn(chrome.storage.local, "get");

    await nextImage();

    expect(getSpy).toHaveBeenCalledOnce();
    expect(fakeStorage[SOURCE_HEALTH_STORAGE_KEY]).toEqual({});
  });
});
