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

const { ensureCurrent, rotate, trackDownload } = await import(
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
  it("reacquires when stored assets are missing from cache", async () => {
    readPinnedAsset.mockResolvedValueOnce(current).mockResolvedValueOnce(null);
    readCachedImage.mockResolvedValue(undefined);

    await expect(ensureCurrent()).resolves.toEqual(prepared);

    expect(writeHistory).toHaveBeenCalledWith({ history: [] });
    expect(writePinnedAsset).toHaveBeenCalledWith(null);
    expect(source.getRandomAsset).toHaveBeenCalledOnce();
  });

  it("rotates on ensureCurrent when current photo source is no longer active", async () => {
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

    await expect(ensureCurrent()).resolves.toMatchObject({
      sourceId: "earthview",
      sourceAssetId: "earth-1",
    });

    expect(earthviewSource.getRandomAsset).toHaveBeenCalledOnce();
  });

  it("skips rotation on newtab when current photo is fresh and frequency is hourly", async () => {
    getPhotoFrequency.mockResolvedValue("everyhour");
    const freshAsset = { ...current, createdAt: Date.now() };
    readHistory.mockResolvedValue({ history: [freshAsset] });

    await expect(ensureCurrent()).resolves.toEqual(freshAsset);

    expect(source.getRandomAsset).not.toHaveBeenCalled();
  });

  it("rotates when frequency expires", async () => {
    getPhotoFrequency.mockResolvedValue("every15minutes");
    const oldAsset = { ...current, createdAt: Date.now() - 20 * 60 * 1000 };
    readHistory.mockResolvedValue({ history: [oldAsset] });

    await expect(ensureCurrent()).resolves.toEqual(prepared);

    expect(source.getRandomAsset).toHaveBeenCalledOnce();
  });

  it("rotates when rotation is explicitly triggered", async () => {
    await expect(rotate()).resolves.toEqual(prepared);

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

    await expect(rotate()).resolves.toEqual(prepared);
    expect(failingSource.getRandomAsset).toHaveBeenCalled();
    expect(source.getRandomAsset).toHaveBeenCalled();
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
    const [first, second] = await Promise.all([rotate(), rotate()]);

    expect(first).toEqual(prepared);
    expect(second).toEqual(prepared);
    expect(source.getRandomAsset).toHaveBeenCalledTimes(2);
  });

  it("generates and caches thumbnail derivative when image is rotated", async () => {
    const fakeThumbBlob = new Blob(["fake-webp"], { type: "image/webp" });
    createThumbnail.mockResolvedValueOnce(fakeThumbBlob);

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
    tenItems[0] = { ...tenItems[0]!, cacheKey: "shared-cache-key" };

    readHistory.mockResolvedValue({ history: tenItems });

    await expect(rotate()).resolves.toEqual(prepared);

    expect(deleteCachedImage).not.toHaveBeenCalledWith("shared-cache-key");
    expect(deleteCachedThumbnail).not.toHaveBeenCalledWith("shared-cache-key");
  });
});
