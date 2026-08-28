import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActiveImageSource,
  getImageSource,
  listImageSources,
} from "../src/ts/sources";

let selectedSource: unknown;

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  selectedSource = undefined;
  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      sync: {
        get: (_keys: unknown, callback?: (value: unknown) => void) => {
          const res = { imageSource: selectedSource };
          if (callback) callback(res);
          return Promise.resolve(res);
        },
      },
    },
  });
});

describe("image source registry", () => {
  it("lists all bundled sources and defaults to unsplash", async () => {
    expect(await getActiveImageSource()).toMatchObject({ id: "unsplash" });
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
    expect(getImageSource("local")).toMatchObject({
      id: "local",
    });
    expect(getImageSource("future-source")).toBeNull();
  });

  it("maps the legacy official selection to Unsplash", async () => {
    selectedSource = "official";

    expect(await getActiveImageSource()).toMatchObject({ id: "unsplash" });
  });

  it.each(["custom", "future-source"])(
    "falls back for an unavailable %s selection",
    async (sourceId) => {
      selectedSource = sourceId;

      expect(await getActiveImageSource()).toMatchObject({ id: "unsplash" });
    },
  );

  it("disables the local folder source in Firefox", async () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
    });

    const sources = listImageSources();
    expect(sources.some((s) => s.id === "local")).toBe(false);
    expect(sources.map((s) => s.id)).toEqual(["unsplash", "earthview"]);
    expect(getImageSource("local")).toBeNull();

    selectedSource = "local";
    expect(await getActiveImageSource()).toMatchObject({ id: "unsplash" });
  });
});
