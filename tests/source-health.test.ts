import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSourceHealthMap,
  parseSourceHealth,
  SOURCE_HEALTH_STORAGE_KEY,
  setSourceError,
} from "../src/ts/sources/source-health";

let storage: Record<string, unknown> = {};

beforeEach(() => {
  storage = {};
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: async () => storage,
        set: async (values: Record<string, unknown>) => {
          Object.assign(storage, values);
        },
      },
    },
  });
});

describe("source errors", () => {
  it("stores only the latest failure and removes it on success", async () => {
    await setSourceError("unsplash", "Timed out");
    await setSourceError("earthview", "Couldn’t connect");
    await setSourceError("unsplash", "Check API key");
    expect(await getSourceHealthMap()).toEqual({
      unsplash: "Check API key",
      earthview: "Couldn’t connect",
    });

    await setSourceError("unsplash", "");
    expect(await getSourceHealthMap()).toEqual({
      earthview: "Couldn’t connect",
    });
    expect(storage[SOURCE_HEALTH_STORAGE_KEY]).toEqual({
      earthview: "Couldn’t connect",
    });
  });

  it("ignores invalid or obsolete records instead of displaying them", () => {
    expect(parseSourceHealth(null)).toEqual({});
    expect(
      parseSourceHealth({
        unsplash: "Timed out",
        earthview: "",
        local: { consecutiveFailures: 3 },
      }),
    ).toEqual({ unsplash: "Timed out" });
  });
});
