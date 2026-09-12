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
