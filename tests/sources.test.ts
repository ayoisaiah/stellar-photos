import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActiveImageSource,
  getImageSource,
  listImageSources,
} from "../src/ts/sources";

let selectedSource: unknown;

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
});
