import { describe, expect, it } from "vitest";

import {
  formatCoordinates,
  formatDimensions,
  formatElevation,
} from "../src/ts/components/photo-info";

describe("photo info formatters", () => {
  it("formats valid geographic coordinates", () => {
    expect(formatCoordinates(37.7749, -122.4194)).toBe(
      "37.7749° N, 122.4194° W",
    );
    expect(formatCoordinates(-33.8688, 151.2093)).toBe(
      "33.8688° S, 151.2093° E",
    );
    expect(formatCoordinates(0, 0)).toBe("0.0000° N, 0.0000° E");
  });

  it("handles missing or invalid coordinates gracefully", () => {
    expect(formatCoordinates(undefined, undefined)).toBe("—");
    expect(formatCoordinates(37.7749, undefined)).toBe("—");
    expect(formatCoordinates(NaN, 10)).toBe("—");
    expect(formatCoordinates(Infinity, 10)).toBe("—");
  });

  it("formats elevation in meters", () => {
    expect(formatElevation(1234)).toBe("1,234 m");
    expect(formatElevation(0)).toBe("0 m");
    expect(formatElevation(5253.089)).toBe("5,253 m");
  });

  it("handles missing or invalid elevation", () => {
    expect(formatElevation(undefined)).toBe("—");
    expect(formatElevation(NaN)).toBe("—");
  });

  it("formats photo dimensions", () => {
    expect(formatDimensions(1920, 1080)).toBe("1920 × 1080");
    expect(formatDimensions(0, 0)).toBe("—");
    expect(formatDimensions(undefined, 1000)).toBe("—");
  });
});
