import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset } from "../src/ts/assets";
import type { ImageSource } from "../src/ts/sources";

const setImageSourceId = vi.fn();
const getImageSourceId = vi.fn();
const deleteCachedImage = vi.fn();
const putCachedImage = vi.fn();
const readCachedImage = vi.fn();
const readHistory = vi.fn();
const writeHistory = vi.fn();
const getActiveImageSource = vi.fn();
const getImageSource = vi.fn();
const readPinned = vi.fn();
const readStagedKeys = vi.fn().mockResolvedValue([]);
const addStagedKey = vi.fn().mockResolvedValue(undefined);
const removeStagedKey = vi.fn().mockResolvedValue(undefined);

vi.mock("../src/ts/settings", () => ({ getImageSourceId, setImageSourceId }));
vi.mock("../src/ts/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/ts/cache")>()),
  deleteCachedImage,
  putCachedImage,
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
  readPinned,
  readStagedKeys,
  addStagedKey,
  removeStagedKey,
}));

const { commitSource, prepareSource, purgeFolder, rotate, trackDownload } =
  await import("../src/ts/actions");

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
  getImageSourceId.mockResolvedValue("unsplash");
  deleteCachedImage.mockResolvedValue(true);
  readCachedImage.mockResolvedValue(new Response("image"));
  readHistory.mockResolvedValue({ history: [current] });
  writeHistory.mockResolvedValue(undefined);
  readPinned.mockResolvedValue(false);
});

describe("source activation", () => {
  it("prepares a source photograph without persisting the selection", async () => {
    await expect(prepareSource("unsplash")).resolves.toEqual(prepared);

    expect(source.getRandomAsset).toHaveBeenCalledOnce();
    expect(source.downloadAsset).toHaveBeenCalledWith(candidate);
    expect(putCachedImage).toHaveBeenCalledWith(
      prepared.cacheKey,
      expect.any(Response),
    );
    expect(writeHistory).not.toHaveBeenCalled();
    expect(setImageSourceId).not.toHaveBeenCalled();
  });

  it("persists only through the separate commit step", async () => {
    await commitSource(prepared);

    expect(setImageSourceId).toHaveBeenCalledWith("unsplash");
    expect(writeHistory).toHaveBeenCalledWith({
      history: [prepared, current],
    });
  });

  it("rejects an unavailable source without doing work", async () => {
    getImageSource.mockReturnValue(null);

    await expect(prepareSource("missing")).rejects.toThrow(
      "Unknown image source",
    );
    expect(source.getRandomAsset).not.toHaveBeenCalled();
    expect(setImageSourceId).not.toHaveBeenCalled();
  });

  it("skips rotation when the active source reports the current photo is fresh", async () => {
    source.shouldRotate = vi.fn().mockResolvedValue(false);

    await expect(rotate()).resolves.toEqual(current);

    expect(source.shouldRotate).toHaveBeenCalledWith(current);
    expect(source.getRandomAsset).not.toHaveBeenCalled();
    expect(writeHistory).not.toHaveBeenCalled();
  });

  it("skips rotation when rotation is pinned", async () => {
    readPinned.mockResolvedValue(true);
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

  it("forces rotation even when rotation is pinned", async () => {
    readPinned.mockResolvedValue(true);
    source.shouldRotate = vi.fn().mockResolvedValue(false);

    await expect(rotate(true)).resolves.toEqual(prepared);

    expect(source.getRandomAsset).toHaveBeenCalledOnce();
    expect(writeHistory).toHaveBeenCalledWith({
      history: [prepared, current],
    });
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

    const [first, second] = await Promise.all([rotate(true), rotate(true)]);

    expect(first).toEqual(prepared);
    expect(second).toEqual(prepared);
    expect(source.getRandomAsset).toHaveBeenCalledTimes(2);
  });

  it("purges folder assets from history and cache", async () => {
    const localAsset: BackgroundAsset = {
      ...candidate,
      sourceId: "local",
      sourceAssetId: "photo-local",
      cacheKey: "cache-local",
      sourcePayload: { folderId: "folder-1" },
    };
    readHistory.mockResolvedValue({ history: [localAsset, current] });

    await purgeFolder("folder-1");

    expect(writeHistory).toHaveBeenCalledWith({ history: [current] });
    expect(deleteCachedImage).toHaveBeenCalledWith("cache-local");
  });
});
