import { beforeEach, describe, expect, it, vi } from "vitest";

const nextImage = vi.fn();
const trackDownload = vi.fn();
const readCachedImage = vi.fn();
const current = {
  sourceId: "unsplash",
  sourceAssetId: "photo-1",
  cacheKey: "https://cache.stellar-photos.invalid/asset/unsplash/photo-1",
};

vi.mock("../src/ts/actions", () => ({
  nextImage,
  trackDownload,
}));

vi.mock("../src/ts/cache", () => ({ readCachedImage }));

const { dispatch } = await import("../src/ts/service-worker");

beforeEach(() => {
  vi.clearAllMocks();
  readCachedImage.mockReset();
});

describe("service worker commands", () => {
  it("handles nextImage commands", async () => {
    nextImage.mockResolvedValue(undefined);

    await expect(dispatch({ command: "nextImage" })).resolves.toEqual({
      ok: true,
    });
    expect(nextImage).toHaveBeenCalledWith();
  });

  it("handles track-download commands", async () => {
    await expect(
      dispatch({ command: "track-download", asset: current }),
    ).resolves.toEqual({ ok: true });
    expect(trackDownload).toHaveBeenCalledWith(current);
  });

  it("rejects malformed commands", async () => {
    await expect(dispatch({ command: "unknown-cmd" })).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_COMMAND", message: "Unknown command" },
    });
  });

  it("returns NEEDS_PAGE_CONTEXT error code when local permission is required", async () => {
    const error = new Error("Failed to execute 'getFileHandle'");
    error.name = "LocalPermissionError";
    nextImage.mockRejectedValue(error);

    await expect(dispatch({ command: "nextImage" })).resolves.toEqual({
      ok: false,
      error: {
        code: "NEEDS_PAGE_CONTEXT",
        message: "Failed to execute 'getFileHandle'",
      },
    });
  });

  it("returns OPERATION_FAILED for generic errors", async () => {
    nextImage.mockRejectedValue(new Error("Network timeout"));

    await expect(dispatch({ command: "nextImage" })).resolves.toEqual({
      ok: false,
      error: {
        code: "OPERATION_FAILED",
        message: "Network timeout",
      },
    });
  });

  it.each([false, true])(
    "reads cached image bytes (thumbnail: %s)",
    async (thumbnail) => {
      const image = new Blob(["cached image"], { type: "image/png" });
      readCachedImage.mockResolvedValueOnce(new Response(image));

      const result = await dispatch({
        command: "read-image",
        cacheKey: current.cacheKey,
        thumbnail,
      });

      expect(readCachedImage).toHaveBeenCalledWith(
        current.cacheKey,
        ...(thumbnail ? ["thumbnail"] : []),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.message);

      expect(result.image).toBeInstanceOf(Blob);
      expect(await result.image?.text()).toBe("cached image");
      expect(result.image?.type).toBe("image/png");
    },
  );

  it("falls back to the full image when the background thumbnail is missing", async () => {
    readCachedImage
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(new Response("full"));

    const result = await dispatch({
      command: "read-image",
      cacheKey: current.cacheKey,
      thumbnail: true,
    });

    expect(readCachedImage).toHaveBeenNthCalledWith(
      1,
      current.cacheKey,
      "thumbnail",
    );
    expect(readCachedImage).toHaveBeenNthCalledWith(2, current.cacheKey);
    if (!result.ok) throw new Error(result.error.message);

    expect(await result.image?.text()).toBe("full");
  });

  it("returns null when the background image is missing", async () => {
    await expect(
      dispatch({ command: "read-image", cacheKey: current.cacheKey }),
    ).resolves.toEqual({ ok: true, image: null });
  });

  it("rejects invalid image cache keys", async () => {
    const result = await dispatch({
      command: "read-image",
      cacheKey: "https://example.com/image",
    });

    expect(result.ok).toBe(false);
    expect(readCachedImage).not.toHaveBeenCalled();
  });
});
