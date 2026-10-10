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

  it.each(["image", "thumbnail"])(
    "reads cached image bytes (kind: %s)",
    async (kind) => {
      const image = new Blob(["cached image"], { type: "image/png" });
      readCachedImage.mockResolvedValueOnce(new Response(image));

      const result = await dispatch({
        command: "read-image",
        cacheKey: current.cacheKey,
        kind,
      });

      expect(readCachedImage).toHaveBeenCalledWith(current.cacheKey, kind);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.message);

      expect(result.image).toBeInstanceOf(Blob);
      expect(await result.image?.text()).toBe("cached image");
      expect(result.image?.type).toBe("image/png");
    },
  );

  it("returns null when the background thumbnail is missing without reading the full image", async () => {
    readCachedImage.mockResolvedValueOnce(undefined);

    await expect(
      dispatch({
        command: "read-image",
        cacheKey: current.cacheKey,
        kind: "thumbnail",
      }),
    ).resolves.toEqual({ ok: true, image: null });
    expect(readCachedImage).toHaveBeenCalledExactlyOnceWith(
      current.cacheKey,
      "thumbnail",
    );
  });

  it("returns null when the background image is missing", async () => {
    await expect(
      dispatch({ command: "read-image", cacheKey: current.cacheKey }),
    ).resolves.toEqual({ ok: true, image: null });
  });

  it("returns null for an unrecognized image cache key", async () => {
    const result = await dispatch({
      command: "read-image",
      cacheKey: "https://example.com/image",
    });

    expect(result).toEqual({ ok: true, image: null });
    expect(readCachedImage).toHaveBeenCalledWith(
      "https://example.com/image",
      undefined,
    );
  });
});
