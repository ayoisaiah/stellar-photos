import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readCachedImage = vi.fn();

vi.mock("../src/ts/cache", () => ({ readCachedImage }));

const { readImage } = await import("../src/ts/image-reader");
const cacheKey = "https://cache.stellar-photos.invalid/asset/unsplash/photo-1";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("chrome", { runtime: { sendMessage: vi.fn() } });
  vi.stubGlobal("location", { protocol: "moz-extension:" });
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("returns undefined on cache miss when chrome runtime is unavailable", async () => {
    readCachedImage.mockResolvedValue(undefined);
    vi.stubGlobal("chrome", undefined);

    expect(await readImage(cacheKey)).toBeUndefined();
    expect(await readImage(cacheKey, true)).toBeUndefined();
  });

  it("falls back to background worker read-image on cache miss (e.g. in container tabs)", async () => {
    readCachedImage.mockResolvedValue(undefined);

    const image = new Blob(["hello"], { type: "image/png" });
    const sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      image,
    });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
    });

    const response = await readImage(cacheKey);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "read-image",
      cacheKey,
      thumbnail: false,
    });
    expect(response).toBeDefined();
    expect(await response?.text()).toBe("hello");
    expect(response?.headers.get("content-type")).toBe("image/png");
  });

  it("does not message the background on Chromium cache misses", async () => {
    vi.stubGlobal("location", { protocol: "chrome-extension:" });

    expect(await readImage(cacheKey)).toBeUndefined();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
});
