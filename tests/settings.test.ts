import { describe, expect, it } from "vitest";

import {
  coreStore,
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  displayStore,
} from "../src/ts/settings";
import { defineStore } from "../src/ts/store";

describe("defineStore parse resilience", () => {
  it("falls back to defaults when input is corrupted or non-object", () => {
    expect(coreStore.parse(null)).toEqual(DEFAULT_CORE_SETTINGS);
    expect(coreStore.parse(undefined)).toEqual(DEFAULT_CORE_SETTINGS);
    expect(coreStore.parse("invalid-string")).toEqual(DEFAULT_CORE_SETTINGS);
    expect(coreStore.parse(12345)).toEqual(DEFAULT_CORE_SETTINGS);
    expect(coreStore.parse([])).toEqual(DEFAULT_CORE_SETTINGS);
  });

  it("falls back to defaults when data is written by a newer schema version (version > 1)", () => {
    const newerVersionData = {
      version: 2,
      activeSourceIds: ["future-source"],
      photoFrequency: "future-freq",
    };
    expect(coreStore.parse(newerVersionData)).toEqual(DEFAULT_CORE_SETTINGS);

    const futureDisplay = {
      version: 5,
      landscapeMode: "future-mode",
    };
    expect(displayStore.parse(futureDisplay)).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it("recovers individual corrupted fields with defaults while preserving valid fields", () => {
    const partiallyCorrupted = {
      version: 1,
      activeSourceIds: "not-an-array", // Corrupted
      photoFrequency: "everyhour", // Valid
    };

    expect(coreStore.parse(partiallyCorrupted)).toEqual({
      version: 1,
      activeSourceIds: DEFAULT_CORE_SETTINGS.activeSourceIds,
      photoFrequency: "everyhour",
    });

    const emptyArrayCorrupted = {
      version: 1,
      activeSourceIds: [], // Invalid: activeSourceIds validator requires length > 0
      photoFrequency: "everyday",
    };

    expect(coreStore.parse(emptyArrayCorrupted)).toEqual({
      version: 1,
      activeSourceIds: DEFAULT_CORE_SETTINGS.activeSourceIds,
      photoFrequency: "everyday",
    });

    const invalidFrequency = {
      version: 1,
      activeSourceIds: ["smithsonian"],
      photoFrequency: "everySecond", // Corrupted
    };

    expect(coreStore.parse(invalidFrequency)).toEqual({
      version: 1,
      activeSourceIds: ["smithsonian"],
      photoFrequency: DEFAULT_CORE_SETTINGS.photoFrequency,
    });
  });

  it("custom store with defineStore parses corrupted and valid values strictly", () => {
    const customStore = defineStore(
      "local",
      "testCustom",
      { version: 1 as const, count: 0, tag: "default" },
      {
        count: (v): v is number => typeof v === "number" && v >= 0,
        tag: (v): v is string => typeof v === "string" && v.length > 0,
      },
    );

    // Corrupted fields
    expect(customStore.parse({ version: 1, count: -5, tag: "" })).toEqual({
      version: 1,
      count: 0,
      tag: "default",
    });

    // Valid fields
    expect(customStore.parse({ version: 1, count: 42, tag: "custom" })).toEqual(
      {
        version: 1,
        count: 42,
        tag: "custom",
      },
    );
  });
});
