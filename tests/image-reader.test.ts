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
    expect(readCachedImage).toHaveBeenCalledWith(cacheKey, "image");
  });

  it("returns cached thumbnail on thumbnail read hit", async () => {
    const cachedThumb = new Response("thumb");
    readCachedImage.mockResolvedValue(cachedThumb);

    expect(await readImage(cacheKey, "thumbnail")).toBe(cachedThumb);
    expect(readCachedImage).toHaveBeenCalledWith(cacheKey, "thumbnail");
  });

  it("does not read the full image when a thumbnail is missing", async () => {
    readCachedImage.mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({ ok: true, image: null }),
      },
    });

    expect(await readImage(cacheKey, "thumbnail")).toBeUndefined();
    expect(readCachedImage).toHaveBeenCalledExactlyOnceWith(
      cacheKey,
      "thumbnail",
    );
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      command: "read-image",
      cacheKey,
      kind: "thumbnail",
    });
  });

  it("returns undefined on cache miss when chrome runtime is unavailable", async () => {
    readCachedImage.mockResolvedValue(undefined);
    vi.stubGlobal("chrome", undefined);

    expect(await readImage(cacheKey)).toBeUndefined();
    expect(await readImage(cacheKey, "thumbnail")).toBeUndefined();
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
      kind: "image",
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
