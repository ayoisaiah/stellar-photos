import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset } from "../src/ts/assets";
import type { ImageSource } from "../src/ts/sources";

const setImageSourceId = vi.fn();
const deleteCachedImage = vi.fn();
const putCachedImage = vi.fn();
const readCachedImage = vi.fn();
const readHistory = vi.fn();
const writeHistory = vi.fn();
const getActiveImageSource = vi.fn();
const getImageSource = vi.fn();
const readPinnedAsset = vi.fn();
const deleteCachedThumbnail = vi.fn();
const putCachedThumbnail = vi.fn();
const createThumbnail = vi.fn().mockResolvedValue(null);

vi.mock("../src/ts/settings", () => ({ setImageSourceId }));
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
  getActiveImageSource,
  getImageSource,
}));
vi.mock("../src/ts/storage", () => ({
  HISTORY_LIMIT: 10,
  readHistory,
  writeHistory,
  readPinnedAsset,
}));

const { rotate, switchSource, trackDownload } = await import(
  "../src/ts/actions"
);

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
  vi.clearAllMocks();
  source = {
    id: "unsplash",
    name: "Unsplash",
    getRandomAsset: vi.fn().mockResolvedValue(candidate),
    downloadAsset: vi.fn().mockResolvedValue(new Response("image")),
  };
  getImageSource.mockReturnValue(source);
  getActiveImageSource.mockResolvedValue(source);
  deleteCachedImage.mockResolvedValue(true);
  readCachedImage.mockResolvedValue(new Response("image"));
  readHistory.mockResolvedValue({ history: [current] });
  writeHistory.mockResolvedValue(undefined);
  readPinnedAsset.mockResolvedValue(null);
});

describe("source activation", () => {
  it("switches source and promotes its first photograph in one operation", async () => {
    await expect(switchSource("unsplash")).resolves.toEqual(prepared);

    expect(source.getRandomAsset).toHaveBeenCalledOnce();
    expect(source.downloadAsset).toHaveBeenCalledWith(candidate);
    expect(putCachedImage).toHaveBeenCalledWith(
      prepared.cacheKey,
      expect.any(Response),
    );
    expect(setImageSourceId).toHaveBeenCalledWith("unsplash");
    expect(writeHistory).toHaveBeenCalledWith({
      history: [prepared, current],
    });
  });

  it("rejects an unavailable source without doing work", async () => {
    getImageSource.mockReturnValue(null);

    await expect(switchSource("missing")).rejects.toThrow(
      "Unknown image source",
    );
    expect(source.getRandomAsset).not.toHaveBeenCalled();
    expect(setImageSourceId).not.toHaveBeenCalled();
  });

  it("does not change source when promotion fails", async () => {
    writeHistory.mockRejectedValue(new Error("storage failed"));

    await expect(switchSource("unsplash")).rejects.toThrow("storage failed");

    expect(setImageSourceId).not.toHaveBeenCalled();
  });

  it("changes the preferred source without loading while pinned", async () => {
    readPinnedAsset.mockResolvedValue(current);

    await expect(switchSource("unsplash")).resolves.toEqual(current);

    expect(setImageSourceId).toHaveBeenCalledWith("unsplash");
    expect(source.getRandomAsset).not.toHaveBeenCalled();
    expect(writeHistory).not.toHaveBeenCalled();
  });

  it("skips rotation when the active source reports the current photo is fresh", async () => {
    source.shouldRotate = vi.fn().mockResolvedValue(false);

    await expect(rotate()).resolves.toEqual(current);

    expect(source.shouldRotate).toHaveBeenCalledWith(current);
    expect(source.getRandomAsset).not.toHaveBeenCalled();
    expect(writeHistory).not.toHaveBeenCalled();
  });

  it("skips rotation when rotation is pinned", async () => {
    readPinnedAsset.mockResolvedValue(current);
    source.shouldRotate = vi.fn().mockResolvedValue(true);

    await expect(rotate()).resolves.toEqual(current);

    expect(source.getRandomAsset).not.toHaveBeenCalled();
    expect(writeHistory).not.toHaveBeenCalled();
  });

  it("rotates when the active source allows it", async () => {
    source.shouldRotate = vi.fn().mockResolvedValue(true);

    await expect(rotate()).resolves.toEqual(prepared);

    expect(source.shouldRotate).toHaveBeenCalledWith(current);
    expect(source.getRandomAsset).toHaveBeenCalledOnce();
    expect(writeHistory).toHaveBeenCalledWith({
      history: [prepared, current],
    });
  });

  it("does not ingest a download when an asset becomes pinned", async () => {
    readPinnedAsset.mockResolvedValueOnce(null).mockResolvedValueOnce(current);

    await expect(rotate()).resolves.toEqual(current);

    expect(source.downloadAsset).toHaveBeenCalledWith(candidate);
    expect(putCachedImage).not.toHaveBeenCalled();
    expect(writeHistory).not.toHaveBeenCalled();
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

  it("coalesces concurrent rotate requests and drains pending rotation", async () => {
    source.shouldRotate = vi.fn().mockResolvedValue(true);

    const [first, second] = await Promise.all([rotate(), rotate()]);

    expect(first).toEqual(prepared);
    expect(second).toEqual(prepared);
    expect(source.getRandomAsset).toHaveBeenCalledTimes(2);
  });

  it("generates and caches thumbnail derivative when image is rotated", async () => {
    const fakeThumbBlob = new Blob(["fake-webp"], { type: "image/webp" });
    createThumbnail.mockResolvedValueOnce(fakeThumbBlob);
    source.shouldRotate = vi.fn().mockResolvedValue(true);

    await expect(rotate()).resolves.toEqual(prepared);

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
    source.shouldRotate = vi.fn().mockResolvedValue(true);

    await expect(rotate()).resolves.toEqual(prepared);

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
    // Item at index 0 also shares the cache key
    tenItems[0] = { ...tenItems[0]!, cacheKey: "shared-cache-key" };

    readHistory.mockResolvedValue({ history: tenItems });
    source.shouldRotate = vi.fn().mockResolvedValue(true);

    await expect(rotate()).resolves.toEqual(prepared);

    expect(deleteCachedImage).not.toHaveBeenCalledWith("shared-cache-key");
    expect(deleteCachedThumbnail).not.toHaveBeenCalledWith("shared-cache-key");
  });
});
