import { describe, expect, it } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import { shouldRotateAtFrequency } from "../src/ts/sources/photo-frequency";

describe("shouldRotateAtFrequency", () => {
  it("evaluates boundary cases for each frequency setting", () => {
    const base: BackgroundAsset = {
      sourceId: "unsplash",
      sourceAssetId: "photo-1",
      cacheKey: "cache-1",
      width: 100,
      height: 100,
      color: null,
      description: null,
      attribution: null,
      sourcePayload: {},
      createdAt: 0,
    };

    const now = Date.now();
    // newtab always rotates
    expect(shouldRotateAtFrequency({ ...base, createdAt: now }, "newtab")).toBe(
      true,
    );

    // 15 minutes: fresh vs expired
    const fifteenMs = 15 * 60 * 1000;
    expect(
      shouldRotateAtFrequency(
        { ...base, createdAt: now - fifteenMs + 1000 },
        "every15minutes",
      ),
    ).toBe(false);
    expect(
      shouldRotateAtFrequency(
        { ...base, createdAt: now - fifteenMs },
        "every15minutes",
      ),
    ).toBe(true);

    // 1 hour: fresh vs expired
    const oneHourMs = 60 * 60 * 1000;
    expect(
      shouldRotateAtFrequency(
        { ...base, createdAt: now - oneHourMs + 1000 },
        "everyhour",
      ),
    ).toBe(false);
    expect(
      shouldRotateAtFrequency(
        { ...base, createdAt: now - oneHourMs },
        "everyhour",
      ),
    ).toBe(true);

    // 24 hours: fresh vs expired
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(
      shouldRotateAtFrequency(
        { ...base, createdAt: now - oneDayMs + 1000 },
        "everyday",
      ),
    ).toBe(false);
    expect(
      shouldRotateAtFrequency(
        { ...base, createdAt: now - oneDayMs },
        "everyday",
      ),
    ).toBe(true);
  });
});
