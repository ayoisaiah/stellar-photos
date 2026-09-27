import { beforeEach, describe, expect, it, vi } from "vitest";

const nextImage = vi.fn();
const trackDownload = vi.fn();
const current = {
  sourceId: "unsplash",
  sourceAssetId: "photo-1",
  cacheKey: "https://cache.stellar-photos.invalid/asset/unsplash/photo-1",
};

vi.mock("../src/ts/actions", () => ({
  nextImage,
  trackDownload,
}));

const { dispatch } = await import("../src/ts/service-worker");

beforeEach(() => {
  vi.clearAllMocks();
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
});
