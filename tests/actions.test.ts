import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset } from "../src/ts/assets";
import type { ImageSource } from "../src/ts/sources";

const getPhotoFrequency = vi.fn();
const deleteCachedImage = vi.fn();
const putCachedImage = vi.fn();
const readCachedImage = vi.fn();
const readHistory = vi.fn();
const writeHistory = vi.fn();
const getActiveImageSources = vi.fn();
const getImageSource = vi.fn();
const readPinnedAsset = vi.fn();
const writePinnedAsset = vi.fn();
const deleteCachedThumbnail = vi.fn();
const putCachedThumbnail = vi.fn();
const createThumbnail = vi.fn().mockResolvedValue(null);

vi.mock("../src/ts/settings", () => ({
  getPhotoFrequency,
}));
vi.mock("../src/ts/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/ts/cache")>()),
  createThumbnail,
  deleteCachedImage,
  deleteCachedThumbnail,
  putCachedImage,
  putCachedThumbnail,
  readCachedImage,
}));
vi.mock("../src/ts/sources", () => ({
  getActiveImageSources,
  getImageSource,
}));
vi.mock("../src/ts/storage", () => ({
  HISTORY_LIMIT: 10,
  readHistory,
  writeHistory,
  readPinnedAsset,
  writePinnedAsset,
}));

const { nextImage, trackDownload } = await import("../src/ts/actions");

const candidate = {
  sourceId: "unsplash",
  sourceAssetId: "photo-2",
  width: 1600,
  height: 900,
  color: null,
  description: null,
  attribution: null,
  payloadVersion: 1,
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
  createThumbnail.mockResolvedValue(null);
  source = {
    id: "unsplash",
    name: "Unsplash",
    getRandomAsset: vi.fn().mockResolvedValue(candidate),
    downloadAsset: vi.fn().mockResolvedValue(new Response("image")),
  };
  getImageSource.mockReturnValue(source);
  getActiveImageSources.mockResolvedValue([source]);
  getPhotoFrequency.mockResolvedValue("newtab");
  deleteCachedImage.mockResolvedValue(true);
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
      getRandomAsset: vi.fn().mockResolvedValue({
        ...candidate,
        sourceId: "earthview",
        sourceAssetId: "earth-1",
      }),
      downloadAsset: vi.fn().mockResolvedValue(new Response("image")),
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
    getPhotoFrequency.mockResolvedValue("everyhour");
    const freshAsset = { ...current, createdAt: Date.now() };
    readHistory.mockResolvedValue({ history: [freshAsset] });

    await expect(nextImage()).resolves.toBeUndefined();

    expect(source.getRandomAsset).not.toHaveBeenCalled();
  });

  it("rotates when frequency expires", async () => {
    getPhotoFrequency.mockResolvedValue("every15minutes");
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
      return new Response("image");
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
      supportsDownload: true,
      didDownload,
    });

    await trackDownload(current);

    expect(didDownload).toHaveBeenCalledWith(current);
  });

  it("ignores download tracking when source does not support downloads", async () => {
    const didDownload = vi.fn().mockResolvedValue(undefined);
    getImageSource.mockReturnValue({
      ...source,
      supportsDownload: false,
      didDownload,
    });

    await trackDownload(current);

    expect(didDownload).not.toHaveBeenCalled();
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
    getPhotoFrequency.mockResolvedValue("everyhour");
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
    createThumbnail.mockResolvedValueOnce(fakeThumbBlob);

    await expect(nextImage()).resolves.toBeUndefined();

    expect(createThumbnail).toHaveBeenCalled();
    expect(putCachedThumbnail).toHaveBeenCalledWith(
      prepared.cacheKey,
      expect.any(Response),
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
    expect(deleteCachedThumbnail).toHaveBeenCalledWith("cache-old-9");
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
    expect(deleteCachedThumbnail).not.toHaveBeenCalledWith("shared-cache-key");
  });
});
