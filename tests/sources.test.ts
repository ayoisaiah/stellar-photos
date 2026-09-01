import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActiveImageSources,
  getImageSource,
  listImageSources,
} from "../src/ts/sources";

let selectedSources: unknown;

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  selectedSources = undefined;
  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      sync: {
        get: (_keys: unknown, callback?: (value: unknown) => void) => {
          const res = {
            coreSettings:
              selectedSources !== undefined
                ? typeof selectedSources === "string"
                  ? { version: 1, activeSourceId: selectedSources }
                  : { version: 1, activeSourceIds: selectedSources }
                : undefined,
          };
          if (callback) callback(res);
          return Promise.resolve(res);
        },
      },
    },
  });
});

describe("image source registry", () => {
  it("lists all bundled sources and defaults to unsplash", async () => {
    expect(await getActiveImageSources()).toEqual([
      expect.objectContaining({ id: "unsplash" }),
    ]);
    expect(listImageSources()).toEqual([
      expect.objectContaining({
        id: "unsplash",
        name: "Unsplash",
      }),
      expect.objectContaining({
        id: "earthview",
        name: "Google Earth View",
      }),
      expect.objectContaining({
        id: "smithsonian",
        name: "Smithsonian Open Access",
      }),
      expect.objectContaining({
        id: "local",
        name: "Local folder",
      }),
    ]);
  });

  it("resolves compiled-in sources by id", () => {
    expect(getImageSource("unsplash")).toMatchObject({
      id: "unsplash",
      supportsDownload: true,
    });
    expect(getImageSource("earthview")).toMatchObject({
      id: "earthview",
      supportsDownload: true,
    });
    expect(getImageSource("smithsonian")).toMatchObject({
      id: "smithsonian",
      supportsDownload: true,
    });
    expect(getImageSource("local")).toMatchObject({
      id: "local",
    });
    expect(getImageSource("future-source")).toBeNull();
  });

  it("resolves multiple active sources", async () => {
    selectedSources = ["unsplash", "earthview", "smithsonian"];

    const active = await getActiveImageSources();
    expect(active.map((s) => s.id)).toEqual([
      "unsplash",
      "earthview",
      "smithsonian",
    ]);
  });

  it("maps the legacy official selection to Unsplash", async () => {
    selectedSources = "official";

    expect(await getActiveImageSources()).toEqual([
      expect.objectContaining({ id: "unsplash" }),
    ]);
  });

  it.each(["custom", "future-source"])(
    "falls back for an unavailable %s selection",
    async (sourceId) => {
      selectedSources = [sourceId];

      expect(await getActiveImageSources()).toEqual([
        expect.objectContaining({ id: "unsplash" }),
      ]);
    },
  );

  it("disables the local folder source in Firefox", async () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
    });

    const sources = listImageSources();
    expect(sources.some((s) => s.id === "local")).toBe(false);
    expect(sources.map((s) => s.id)).toEqual([
      "unsplash",
      "earthview",
      "smithsonian",
    ]);
    expect(getImageSource("local")).toBeNull();

    selectedSources = ["local"];
    expect(await getActiveImageSources()).toEqual([
      expect.objectContaining({ id: "unsplash" }),
    ]);
  });
});
