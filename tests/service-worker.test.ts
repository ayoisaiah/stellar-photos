import { beforeEach, describe, expect, it, vi } from "vitest";

const commitSource = vi.fn();
const discardSource = vi.fn();
const ensureCurrent = vi.fn();
const initializeSettingsAndHistory = vi.fn();
const prepareSource = vi.fn();
const rotate = vi.fn();
const trackDownload = vi.fn();
const current = { sourceId: "unsplash", sourceAssetId: "photo-1" };

vi.mock("../src/ts/actions", () => ({
  commitSource,
  discardSource,
  ensureCurrent,
  initializeSettingsAndHistory,
  prepareSource,
  rotate,
  trackDownload,
}));

const { dispatch } = await import("../src/ts/service-worker");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("service worker commands", () => {
  it("activates a compiled-in source and returns its first photograph", async () => {
    prepareSource.mockResolvedValue(current);

    await expect(
      dispatch({ command: "prepare-source", sourceId: "unsplash" }),
    ).resolves.toEqual({ ok: true, current });
    expect(prepareSource).toHaveBeenCalledWith("unsplash");
  });

  it("commits a source only after the page requests activation", async () => {
    await expect(
      dispatch({ command: "commit-source", asset: current }),
    ).resolves.toEqual({ ok: true, current: null });
    expect(commitSource).toHaveBeenCalledWith(current);
  });

  it("rejects malformed source-selection commands", async () => {
    await expect(dispatch({ command: "prepare-source" })).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_COMMAND", message: "Unknown command" },
    });
    expect(prepareSource).not.toHaveBeenCalled();
  });

  it("returns source activation errors to the page", async () => {
    prepareSource.mockRejectedValue(new Error("Unknown image source"));

    await expect(
      dispatch({ command: "prepare-source", sourceId: "missing" }),
    ).resolves.toEqual({
      ok: false,
      error: { code: "OPERATION_FAILED", message: "Unknown image source" },
    });
  });

  it("handles track-download commands", async () => {
    await expect(
      dispatch({ command: "track-download", asset: current }),
    ).resolves.toEqual({ ok: true, current: null });
    expect(trackDownload).toHaveBeenCalledWith(current);
  });

  it("handles rotate commands with force parameter", async () => {
    rotate.mockResolvedValue(current);

    await expect(dispatch({ command: "rotate", force: true })).resolves.toEqual(
      { ok: true, current },
    );
    expect(rotate).toHaveBeenCalledWith(true);
  });

  it("returns NEEDS_PAGE_CONTEXT error code when local permission is required", async () => {
    const error = new Error("Failed to execute 'getFileHandle'");
    error.name = "LocalPermissionError";
    rotate.mockRejectedValue(error);

    await expect(dispatch({ command: "rotate" })).resolves.toEqual({
      ok: false,
      error: {
        code: "NEEDS_PAGE_CONTEXT",
        message: "Failed to execute 'getFileHandle'",
      },
    });
  });
});
