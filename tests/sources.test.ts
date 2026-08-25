import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveImageSource } from "../src/ts/sources";

let selectedSource: unknown;

beforeEach(() => {
  selectedSource = undefined;
  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      sync: {
        get: (_keys: unknown, callback: (value: unknown) => void) =>
          callback({ imageSource: selectedSource }),
      },
    },
  });
});

describe("image source registry", () => {
  it("keeps the only bundled source internal and active", async () => {
    expect(await getActiveImageSource()).toMatchObject({ id: "unsplash" });
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
