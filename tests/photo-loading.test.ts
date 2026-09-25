import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";

const readPinnedAsset = vi.fn();
const readHistory = vi.fn();
const writePinnedAsset = vi.fn();
const readImage = vi.fn();
const sendMessage = vi.fn();

vi.mock("../src/ts/storage", async (original) => ({
  ...(await original<typeof import("../src/ts/storage")>()),
  readPinnedAsset,
  readHistory,
  writePinnedAsset,
}));
vi.mock("../src/ts/image-reader", () => ({ readImage }));

const { StellarApp } = await import("../src/ts/components/stellar-app");
const asset: BackgroundAsset = {
  sourceId: "unsplash",
  sourceAssetId: "photo-1",
  cacheKey: "https://cache.stellar-photos.invalid/asset/unsplash/photo-1",
  width: 1600,
  height: 900,
  color: null,
  description: null,
  attribution: null,
  payloadVersion: 1,
  sourcePayload: {},
  createdAt: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("chrome", {
    runtime: { sendMessage, getManifest: () => ({ version: "5.0.0" }) },
    storage: {
      sync: { get: async () => ({}) },
      local: { get: async () => ({}) },
    },
  });
  readPinnedAsset.mockResolvedValue(null);
  readHistory.mockResolvedValue({ history: [asset] });
  readImage.mockImplementation(async () => new Response("image"));
});

afterEach(() => vi.unstubAllGlobals());

it("loads the pin without fetching or clearing it", async () => {
  readPinnedAsset.mockResolvedValue(asset);
  const app = new StellarApp();

  await app["loadCurrentPhoto"]();

  expect(app["currentAsset"]).toEqual(asset);
  expect(app["photoLoadState"]).toBe("ready");
  expect(sendMessage).not.toHaveBeenCalled();
  expect(writePinnedAsset).not.toHaveBeenCalled();
  app["releaseObjectUrl"]();
});

it("uses startup's selected photo without rereading storage", async () => {
  sendMessage.mockResolvedValue({ ok: true });
  const app = new StellarApp();

  await app["initializeState"]();

  expect(readPinnedAsset).toHaveBeenCalledOnce();
  expect(readHistory).toHaveBeenCalledOnce();
  expect(app["currentAsset"]).toEqual(asset);
  app["releaseObjectUrl"]();
});

it("fetches once on first startup before loading the saved image", async () => {
  readHistory.mockResolvedValue({ history: [] });
  sendMessage.mockImplementation(async () => {
    readHistory.mockResolvedValue({ history: [asset] });
    return { ok: true };
  });
  const app = new StellarApp();

  await app["initializeState"]();

  expect(sendMessage).toHaveBeenCalledExactlyOnceWith({ command: "nextImage" });
  expect(app["currentAsset"]).toEqual(asset);
  expect(app["photoLoadState"]).toBe("ready");
  app["releaseObjectUrl"]();
});

it("shows an error for an unavailable saved image without fetching", async () => {
  readImage.mockResolvedValue(undefined);
  const app = new StellarApp();
  vi.spyOn(console, "log").mockImplementation(() => undefined);

  await app["loadCurrentPhoto"]();

  expect(app["photoLoadState"]).toBe("error");
  expect(sendMessage).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

it("preserves the displayed photo and pin until a history image is available", async () => {
  const app = new StellarApp();
  await app["loadCurrentPhoto"](asset);
  app["pinnedAsset"] = asset;
  const previousUrl = app["currentPhotoURL"];
  const nextAsset = {
    ...asset,
    sourceAssetId: "photo-2",
    cacheKey: "next-image",
    createdAt: 2,
  };
  const revoke = vi.spyOn(URL, "revokeObjectURL");

  try {
    readImage.mockResolvedValueOnce(undefined);
    expect(await app["showHistoryAsset"](nextAsset)).toBe(false);
    expect(app["currentPhotoURL"]).toBe(previousUrl);
    expect(app["currentAsset"]).toBe(asset);
    expect(writePinnedAsset).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();

    expect(await app["showHistoryAsset"](nextAsset)).toBe(true);
    expect(app["currentPhotoURL"]).not.toBe(previousUrl);
    expect(app["currentAsset"]).toBe(nextAsset);
    expect(writePinnedAsset).toHaveBeenCalledExactlyOnceWith(nextAsset);
    expect(revoke).toHaveBeenCalledExactlyOnceWith(previousUrl);
  } finally {
    app["releaseObjectUrl"]();
    revoke.mockRestore();
  }
});

it.each([null, asset])(
  "pins a history selection once with previous pin %j",
  async (pinned) => {
    const app = new StellarApp();
    app["pinnedAsset"] = pinned;
    const selectedAsset = { ...asset, cacheKey: "selected-image" };
    const event = new CustomEvent("select-photo", {
      detail: { asset: selectedAsset },
    });

    readImage.mockResolvedValueOnce(undefined);
    await app["handleSelectHistoryPhoto"](event);
    expect(writePinnedAsset).not.toHaveBeenCalled();
    expect(app["pinnedAsset"]).toBe(pinned);

    await app["handleSelectHistoryPhoto"](event);
    expect(writePinnedAsset).toHaveBeenCalledExactlyOnceWith(selectedAsset);
    expect(app["pinnedAsset"]).toBe(selectedAsset);
    expect(app["currentAsset"]).toBe(selectedAsset);
    app["releaseObjectUrl"]();
  },
);

it.each([asset, { ...asset }])(
  "pins the displayed history photo without reloading it (%#)",
  async (selectedAsset) => {
    const app = new StellarApp();
    await app["loadCurrentPhoto"]();
    const previousUrl = app["currentPhotoURL"];
    readImage.mockClear();
    const revoke = vi.spyOn(URL, "revokeObjectURL");

    try {
      await app["handleSelectHistoryPhoto"](
        new CustomEvent("select-photo", { detail: { asset: selectedAsset } }),
      );

      expect(readImage).not.toHaveBeenCalled();
      expect(revoke).not.toHaveBeenCalled();
      expect(app["currentPhotoURL"]).toBe(previousUrl);
      expect(writePinnedAsset).toHaveBeenCalledExactlyOnceWith(selectedAsset);
      expect(app["pinnedAsset"]).toBe(selectedAsset);
    } finally {
      app["releaseObjectUrl"]();
      revoke.mockRestore();
    }
  },
);

it("caches the history index until the displayed asset or history changes", () => {
  const app = new StellarApp();
  const older = { ...asset, createdAt: 0 };
  app["historyAssets"] = [asset, older];
  app["currentAsset"] = older;
  const findIndex = vi.spyOn(app["historyAssets"], "findIndex");

  try {
    app.willUpdate(new Map([["currentAsset", null]]));
    expect(app["currentSource"]?.id).toBe("unsplash");
    expect(app["isInfoAvailable"]).toBe(true);
    expect(app["isDownloadable"]).toBe(true);
    expect(app["historyIndex"]).toBe(1);
    expect(app["hasNext"]).toBe(true);
    expect(app["hasPrevious"]).toBe(false);
    app.willUpdate(new Map([["openPanel", null]]));
    expect(app["hasNext"]).toBe(true);
    expect(findIndex).toHaveBeenCalledOnce();

    app["historyAssets"] = [asset];
    app.willUpdate(new Map([["historyAssets", [asset, older]]]));
    expect(app["historyIndex"]).toBe(-1);
    expect(app["hasNext"]).toBe(true);
    expect(app["hasPrevious"]).toBe(false);

    app["currentAsset"] = asset;
    app.willUpdate(new Map([["currentAsset", older]]));
    expect(app["historyIndex"]).toBe(0);
    expect(app["hasNext"]).toBe(false);
    expect(app["hasPrevious"]).toBe(false);

    app["currentAsset"] = null;
    app["historyAssets"] = [];
    app.willUpdate(new Map([["currentAsset", asset]]));
    expect(app["currentSource"]).toBeNull();
    expect(app["isInfoAvailable"]).toBe(false);
    expect(app["isDownloadable"]).toBe(false);
    expect(app["historyIndex"]).toBe(0);
    expect(app["hasNext"]).toBe(false);
    expect(app["hasPrevious"]).toBe(false);
  } finally {
    findIndex.mockRestore();
  }
});
