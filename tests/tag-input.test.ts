import { describe, expect, it } from "vitest";

import { parseTags } from "../src/ts/components/tag-input";

describe("tag input parsing", () => {
  it("parses comma-separated values into trimmed arrays", () => {
    expect(parseTags("998309, 317099, 12345")).toEqual([
      "998309",
      "317099",
      "12345",
    ]);
    expect(parseTags("  wallpapers ,  nature  , travel ")).toEqual([
      "wallpapers",
      "nature",
      "travel",
    ]);
  });

  it("handles empty, null, or whitespace-only inputs", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("   , ,   ")).toEqual([]);
  });
});
