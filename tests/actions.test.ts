import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset, ImageSource } from "../src/ts/types";

const setImageSourceId = vi.fn();
const getImageSourceId = vi.fn();
const deleteCachedImage = vi.fn();
const putCachedImage = vi.fn();
const readCachedImage = vi.fn();
const promoteImage = vi.fn();
const readHistory = vi.fn();
const reconcileHistory = vi.fn();
const getActiveImageSource = vi.fn();
const getImageSource = vi.fn();

vi.mock("../src/ts/settings", () => ({ getImageSourceId, setImageSourceId }));
vi.mock("../src/ts/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/ts/cache")>()),
  deleteCachedImage,
  putCachedImage,
  readCachedImage,
}));
vi.mock("../src/ts/history", () => ({
  promoteImage,
  readHistory,
  reconcileHistory,
}));
vi.mock("../src/ts/sources", () => ({
  getActiveImageSource,
  getImageSource,
}));

const { commitSource, prepareSource } = await import("../src/ts/actions");

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
  getImageSourceId.mockResolvedValue("unsplash");
  deleteCachedImage.mockResolvedValue(true);
  readCachedImage.mockResolvedValue(new Response("image"));
  reconcileHistory.mockResolvedValue({ version: 2, history: [current] });
  readHistory.mockResolvedValue({ version: 2, history: [current] });
  promoteImage.mockResolvedValue({ version: 2, history: [prepared, current] });
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
    expect(promoteImage).not.toHaveBeenCalled();
    expect(setImageSourceId).not.toHaveBeenCalled();
  });

  it("persists only through the separate commit step", async () => {
    await commitSource(prepared);

    expect(setImageSourceId).toHaveBeenCalledWith("unsplash");
    expect(promoteImage).toHaveBeenCalledWith(candidate, expect.any(Response));
  });

  it("rejects an unavailable source without doing work", async () => {
    getImageSource.mockReturnValue(null);

    await expect(prepareSource("missing")).rejects.toThrow(
      "Unknown image source",
    );
    expect(source.getRandomAsset).not.toHaveBeenCalled();
    expect(setImageSourceId).not.toHaveBeenCalled();
  });

  it("does not fall back to the previous source after duplicate exhaustion", async () => {
    source.getRandomAsset = vi.fn().mockResolvedValue({
      ...candidate,
      sourceAssetId: current.sourceAssetId,
    });

    await expect(prepareSource("unsplash")).rejects.toThrow(
      "Image source did not return a new photograph",
    );
    expect(source.getRandomAsset).toHaveBeenCalledTimes(3);
    expect(source.downloadAsset).not.toHaveBeenCalled();
    expect(putCachedImage).not.toHaveBeenCalled();
    expect(setImageSourceId).not.toHaveBeenCalled();
  });
});
