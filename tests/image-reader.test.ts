import { beforeEach, describe, expect, it, vi } from "vitest";

const readCachedImage = vi.fn();

vi.mock("../src/ts/cache", () => ({ readCachedImage }));

const { readImage } = await import("../src/ts/image-reader");
const cacheKey = "https://cache.stellar-photos.invalid/asset/unsplash/photo-1";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("readImage", () => {
  it("returns cached image on full image read", async () => {
    const cached = new Response("full-image");
    readCachedImage.mockResolvedValue(cached);

    expect(await readImage(cacheKey)).toBe(cached);
    expect(readCachedImage).toHaveBeenCalledWith(cacheKey);
  });

  it("returns cached thumbnail on thumbnail read hit", async () => {
    const cachedThumb = new Response("thumb");
    readCachedImage.mockResolvedValue(cachedThumb);

    expect(await readImage(cacheKey, true)).toBe(cachedThumb);
    expect(readCachedImage).toHaveBeenCalledWith(cacheKey, "thumbnail");
  });

  it("falls back to full image on thumbnail read miss", async () => {
    const cachedFull = new Response("fallback-full");
    readCachedImage
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(cachedFull);

    expect(await readImage(cacheKey, true)).toBe(cachedFull);
    expect(readCachedImage).toHaveBeenNthCalledWith(1, cacheKey, "thumbnail");
    expect(readCachedImage).toHaveBeenNthCalledWith(2, cacheKey);
  });

  it("returns undefined on cache miss", async () => {
    readCachedImage.mockResolvedValue(undefined);

    expect(await readImage(cacheKey)).toBeUndefined();
    expect(await readImage(cacheKey, true)).toBeUndefined();
  });
});
