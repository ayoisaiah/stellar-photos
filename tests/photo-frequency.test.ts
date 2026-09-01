import { describe, expect, it } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import {
  isPhotoFrequency,
  shouldRotateAtFrequency,
} from "../src/ts/sources/photo-frequency";

describe("photo frequency helper", () => {
  it("validates supported photo frequency values", () => {
    expect(isPhotoFrequency("newtab")).toBe(true);
    expect(isPhotoFrequency("every15minutes")).toBe(true);
    expect(isPhotoFrequency("everyhour")).toBe(true);
    expect(isPhotoFrequency("everyday")).toBe(true);
    expect(isPhotoFrequency("weekly")).toBe(false);
    expect(isPhotoFrequency(null)).toBe(false);
    expect(isPhotoFrequency(123)).toBe(false);
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
      payloadVersion: 1,
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
