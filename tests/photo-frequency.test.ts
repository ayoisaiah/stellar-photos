import { describe, expect, it } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import {
  FREQUENCIES,
  shouldRotateAtFrequency,
} from "../src/ts/sources/photo-frequency";

describe("photo frequency helper", () => {
  it("defines ms intervals for all supported frequencies", () => {
    const values = FREQUENCIES.map((f) => f.value);
    expect(values).toEqual([
      "newtab",
      "every15minutes",
      "everyhour",
      "everyday",
    ]);
    expect(FREQUENCIES.find((f) => f.value === "newtab")?.ms).toBe(0);
    expect(FREQUENCIES.find((f) => f.value === "every15minutes")?.ms).toBe(
      15 * 60 * 1000,
    );
    expect(FREQUENCIES.find((f) => f.value === "everyhour")?.ms).toBe(
      60 * 60 * 1000,
    );
    expect(FREQUENCIES.find((f) => f.value === "everyday")?.ms).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("evaluates shouldRotateAtFrequency based on elapsed time and frequency", () => {
    const asset: BackgroundAsset = {
      sourceId: "unsplash",
      sourceAssetId: "photo-1",
      cacheKey: "cache-1",
      width: 100,
      height: 100,
      color: null,
      description: null,
      attribution: null,
      sourcePayload: {},
      createdAt: Date.now() - 20 * 60 * 1000, // 20 minutes ago
    };

    expect(shouldRotateAtFrequency(asset, "newtab")).toBe(true);
    expect(shouldRotateAtFrequency(asset, "every15minutes")).toBe(true);
    expect(shouldRotateAtFrequency(asset, "everyhour")).toBe(false);
    expect(shouldRotateAtFrequency(asset, "everyday")).toBe(false);

    const hourOldAsset = {
      ...asset,
      createdAt: Date.now() - 65 * 60 * 1000, // 65 minutes ago
    };
    expect(shouldRotateAtFrequency(hourOldAsset, "everyhour")).toBe(true);
    expect(shouldRotateAtFrequency(hourOldAsset, "everyday")).toBe(false);

    const dayOldAsset = {
      ...asset,
      createdAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    };
    expect(shouldRotateAtFrequency(dayOldAsset, "everyday")).toBe(true);
  });
});
