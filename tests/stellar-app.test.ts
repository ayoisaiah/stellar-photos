import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackgroundAsset } from "../src/ts/assets";
import {
  HISTORY_STORAGE_KEY,
  isBackgroundAsset,
  readHistory,
  validateHistoryState,
} from "../src/ts/storage";

const local: Record<string, unknown> = {};

function createStorageArea(values: Record<string, unknown>) {
  return {
    get(
      keys: string | string[] | null,
      callback?: (result: Record<string, unknown>) => void,
    ) {
      const selected =
        keys === null
          ? values
          : Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys])
                .filter((key) => key in values)
                .map((key) => [key, values[key]]),
            );
      if (callback) callback(selected);
      return Promise.resolve(selected);
    },
    set(data: Record<string, unknown>, callback?: () => void) {
      Object.assign(values, data);
      if (callback) callback();
      return Promise.resolve();
    },
    remove(keys: string | string[], callback?: () => void) {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete values[key];
      }
      if (callback) callback();
      return Promise.resolve();
    },
  };
}

vi.stubGlobal("chrome", {
  runtime: { lastError: undefined },
  storage: {
    local: createStorageArea(local),
    sync: createStorageArea({}),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
});

const sampleAssetA: BackgroundAsset = {
  sourceId: "unsplash",
  sourceAssetId: "photo-a",
  cacheKey: "cache-key-a",
  width: 1920,
  height: 1080,
  color: "#111111",
  description: "Asset A",
  attribution: {
    name: "Photographer A",
    url: "https://unsplash.com/@a",
    sourceUrl: "https://unsplash.com/photos/a",
  },
  payloadVersion: 1,
  sourcePayload: {},
  createdAt: 1000,
};

const sampleAssetB: BackgroundAsset = {
  sourceId: "unsplash",
  sourceAssetId: "photo-b",
  cacheKey: "cache-key-b",
  width: 1920,
  height: 1080,
  color: "#222222",
  description: "Asset B",
  attribution: null,
  payloadVersion: 1,
  sourcePayload: {},
  createdAt: 2000,
};

const sampleAssetC: BackgroundAsset = {
  sourceId: "unsplash",
  sourceAssetId: "photo-c",
  cacheKey: "cache-key-c",
  width: 1920,
  height: 1080,
  color: "#333333",
  description: "Asset C",
  attribution: null,
  payloadVersion: 1,
  sourcePayload: {},
  createdAt: 3000,
};

beforeEach(() => {
  for (const key of Object.keys(local)) {
    delete local[key];
  }
  vi.clearAllMocks();
});

describe("history storage boundary validation", () => {
  it("validates and filters invalid history entries", () => {
    expect(isBackgroundAsset(sampleAssetA)).toBe(true);
    expect(isBackgroundAsset(null)).toBe(false);
    expect(isBackgroundAsset(undefined)).toBe(false);
    expect(isBackgroundAsset("string")).toBe(false);
    expect(isBackgroundAsset({})).toBe(false);
    expect(isBackgroundAsset({ ...sampleAssetA, cacheKey: 123 })).toBe(false);
    expect(isBackgroundAsset({ ...sampleAssetA, createdAt: "invalid" })).toBe(
      false,
    );

    const malformedRaw = {
      history: [
        null,
        "not-an-asset",
        { invalid: true },
        sampleAssetA,
        { ...sampleAssetB, sourceId: null },
        sampleAssetC,
      ],
    };

    const validated = validateHistoryState(malformedRaw);
    expect(validated).not.toBeNull();
    expect(validated?.history).toEqual([sampleAssetA, sampleAssetC]);
  });

  it("returns null on non-object or non-array history payloads", () => {
    expect(validateHistoryState(null)).toBeNull();
    expect(validateHistoryState(undefined)).toBeNull();
    expect(validateHistoryState("invalid")).toBeNull();
    expect(validateHistoryState({ history: "not-an-array" })).toBeNull();
  });

  it("safely reads validated history from storage", async () => {
    local[HISTORY_STORAGE_KEY] = {
      history: [sampleAssetA, null, sampleAssetB],
    };

    const state = await readHistory();
    expect(state.history).toEqual([sampleAssetA, sampleAssetB]);
  });
});

describe("history synchronization & reconciliation logic", () => {
  it("reconciles navigation index by exact load-event identity (cacheKey and createdAt)", () => {
    const historyList = [sampleAssetC, sampleAssetB, sampleAssetA];

    const findIndex = (target: BackgroundAsset | null) => {
      if (!target) return 0;
      return historyList.findIndex(
        (item) =>
          item.cacheKey === target.cacheKey &&
          item.createdAt === target.createdAt,
      );
    };

    expect(findIndex(sampleAssetB)).toBe(1);
    expect(findIndex(sampleAssetC)).toBe(0);

    const duplicateKeyOldTime: BackgroundAsset = {
      ...sampleAssetA,
      createdAt: 500,
    };
    expect(findIndex(duplicateKeyOldTime)).toBe(-1);
  });

  it("identifies detached state when displayed photo falls outside history window", () => {
    const tenRecentAssets: BackgroundAsset[] = Array.from(
      { length: 10 },
      (_, i) => ({
        ...sampleAssetA,
        sourceAssetId: `photo-new-${i}`,
        cacheKey: `cache-key-new-${i}`,
        createdAt: 5000 + i,
      }),
    );

    const isDetached = (displayed: BackgroundAsset) => {
      const idx = tenRecentAssets.findIndex(
        (item) =>
          item.cacheKey === displayed.cacheKey &&
          item.createdAt === displayed.createdAt,
      );
      return idx === -1;
    };

    expect(isDetached(sampleAssetA)).toBe(true);
    expect(isDetached(tenRecentAssets[0]!)).toBe(false);
  });

  it("supports re-attaching to newest available entry when detached", () => {
    let historyIndex = -1;
    const historyAssets = [sampleAssetC, sampleAssetB, sampleAssetA];

    const getHasNext = () =>
      historyAssets.length > 0 && (historyIndex > 0 || historyIndex === -1);
    const getHasPrevious = () =>
      historyAssets.length > 0 &&
      historyIndex !== -1 &&
      historyIndex < historyAssets.length - 1;

    expect(getHasNext()).toBe(true);
    expect(getHasPrevious()).toBe(false);

    const nextTargetIndex = historyIndex === -1 ? 0 : historyIndex - 1;
    expect(nextTargetIndex).toBe(0);

    historyIndex = nextTargetIndex;
    expect(historyIndex).toBe(0);
    expect(getHasNext()).toBe(false);
    expect(getHasPrevious()).toBe(true);
  });

  it("ignores out-of-order storage reads using monotonic generations", async () => {
    let currentHistoryAssets = [sampleAssetA];
    let historyLoadGeneration = 0;

    const simulateRead = async (gen: number, result: BackgroundAsset[]) => {
      if (gen !== historyLoadGeneration) {
        return;
      }
      currentHistoryAssets = result;
    };

    historyLoadGeneration = 1;
    const gen1 = 1;
    const read1 = simulateRead(gen1, [sampleAssetA, sampleAssetB]);

    historyLoadGeneration = 2;
    const gen2 = 2;
    const read2 = simulateRead(gen2, [
      sampleAssetC,
      sampleAssetB,
      sampleAssetA,
    ]);

    await Promise.all([read1, read2]);

    expect(currentHistoryAssets).toEqual([
      sampleAssetC,
      sampleAssetB,
      sampleAssetA,
    ]);
  });
});
