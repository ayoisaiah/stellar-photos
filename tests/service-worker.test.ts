import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureCurrent = vi.fn();
const initializeSettingsAndHistory = vi.fn();
const rotate = vi.fn();
const switchSource = vi.fn();
const trackDownload = vi.fn();
const current = { sourceId: "unsplash", sourceAssetId: "photo-1" };

vi.mock("../src/ts/actions", () => ({
  ensureCurrent,
  initializeSettingsAndHistory,
  rotate,
  switchSource,
  trackDownload,
}));

const { dispatch } = await import("../src/ts/service-worker");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("service worker commands", () => {
  it("activates a compiled-in source and returns its first photograph", async () => {
    switchSource.mockResolvedValue(current);

    await expect(
      dispatch({ command: "switch-source", sourceId: "unsplash" }),
    ).resolves.toEqual({ ok: true, current });
    expect(switchSource).toHaveBeenCalledWith("unsplash");
  });

  it("rejects malformed source-selection commands", async () => {
    await expect(dispatch({ command: "switch-source" })).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_COMMAND", message: "Unknown command" },
    });
    expect(switchSource).not.toHaveBeenCalled();
  });

  it("returns source activation errors to the page", async () => {
    switchSource.mockRejectedValue(new Error("Unknown image source"));

    await expect(
      dispatch({ command: "switch-source", sourceId: "missing" }),
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
