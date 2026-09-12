import { beforeEach, describe, expect, it, vi } from "vitest";

const nextImage = vi.fn();
const trackDownload = vi.fn();
const readCachedImage = vi.fn();
const readCachedThumbnail = vi.fn();
const current = {
  sourceId: "unsplash",
  sourceAssetId: "photo-1",
  cacheKey: "https://cache.stellar-photos.invalid/asset/unsplash/photo-1",
};

vi.mock("../src/ts/cache", () => ({ readCachedImage, readCachedThumbnail }));

vi.mock("../src/ts/actions", () => ({
  nextImage,
  trackDownload,
}));

const { dispatch } = await import("../src/ts/service-worker");

beforeEach(() => {
  vi.clearAllMocks();
  readCachedImage.mockReset();
  readCachedThumbnail.mockReset();
});

describe("service worker commands", () => {
  it("handles nextImage commands", async () => {
    nextImage.mockResolvedValue(undefined);

    await expect(dispatch({ command: "nextImage" })).resolves.toEqual({
      ok: true,
    });
    expect(nextImage).toHaveBeenCalledWith();
    expect(readCachedImage).not.toHaveBeenCalled();
  });

  it("handles track-download commands", async () => {
    await expect(
      dispatch({ command: "track-download", asset: current }),
    ).resolves.toEqual({ ok: true });
    expect(trackDownload).toHaveBeenCalledWith(current);
  });

  it("returns JSON-safe bytes for a cached image", async () => {
    nextImage.mockResolvedValue(undefined);
    const bytes = new Uint8Array([0, 127, 128, 255]);
    readCachedImage.mockResolvedValue(
      new Response(bytes, {
        headers: { "content-type": "image/png" },
      }),
    );

    const result = JSON.parse(
      JSON.stringify(
        await dispatch({
          command: "read-image",
          cacheKey: current.cacheKey,
        }),
      ),
    );

    expect(
      new Uint8Array(await (await fetch(result.image)).arrayBuffer()),
    ).toEqual(bytes);
  });

  it("reads thumbnails in the background and falls back to the full image", async () => {
    readCachedThumbnail.mockResolvedValueOnce(
      new Response("thumbnail", {
        headers: { "content-type": "image/webp" },
      }),
    );
    const request = {
      command: "read-image",
      cacheKey: current.cacheKey,
      thumbnail: true,
    };
    const thumbnail = await dispatch(request);
    expect(
      thumbnail.ok &&
        thumbnail.image &&
        (await (await fetch(thumbnail.image)).text()),
    ).toBe("thumbnail");
    expect(readCachedImage).not.toHaveBeenCalled();

    readCachedImage.mockResolvedValueOnce(new Response("full"));
    const full = await dispatch(request);
    expect(
      full.ok && full.image && (await (await fetch(full.image)).text()),
    ).toBe("full");
    await expect(dispatch(request)).resolves.toEqual({
      ok: true,
      image: null,
    });
  });

  it("rejects cache reads outside the image namespace", async () => {
    const result = await dispatch({
      command: "read-image",
      cacheKey: "https://example.com/",
    });
    expect(result.ok).toBe(false);
    expect(readCachedImage).not.toHaveBeenCalled();
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
});
