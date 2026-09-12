import { afterEach, beforeEach, expect, it, vi } from "vitest";

const readCachedImage = vi.fn();
const readCachedThumbnail = vi.fn();
const sendMessage = vi.fn();

vi.mock("../src/ts/cache", () => ({ readCachedImage, readCachedThumbnail }));

const { readImage } = await import("../src/ts/image-reader");
const cacheKey = "https://cache.stellar-photos.invalid/asset/unsplash/photo-1";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("chrome", { runtime: { sendMessage } });
});

afterEach(() => vi.unstubAllGlobals());

it("reads background bytes when the container's cache is empty", async () => {
  sendMessage.mockResolvedValue({
    ok: true,
    current: null,
    image: "data:image/png;base64,AH+A/w==",
  });

  const response = await readImage(cacheKey);

  expect(sendMessage).toHaveBeenCalledWith({
    command: "read-image",
    cacheKey,
    thumbnail: false,
  });
  expect(response?.headers.get("content-type")).toBe("image/png");
  expect(new Uint8Array(await response!.arrayBuffer())).toEqual(
    new Uint8Array([0, 127, 128, 255]),
  );
});

it("keeps direct cache hits and local full-image thumbnail fallback", async () => {
  const cached = new Response("local");
  readCachedImage.mockResolvedValue(cached);
  expect(await readImage(cacheKey)).toBe(cached);
  expect(sendMessage).not.toHaveBeenCalled();

  sendMessage.mockResolvedValue({ ok: true, current: null, image: null });
  expect(await readImage(cacheKey, true)).toBe(cached);
});

it("distinguishes missing images from background failures", async () => {
  sendMessage.mockResolvedValueOnce({ ok: true, current: null, image: null });
  expect(await readImage(cacheKey)).toBeUndefined();

  sendMessage.mockResolvedValueOnce({
    ok: false,
    error: { message: "Cache failed" },
  });
  await expect(readImage(cacheKey)).rejects.toThrow("Cache failed");
});
