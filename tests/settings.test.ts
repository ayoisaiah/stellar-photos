import { beforeEach, describe, expect, it, vi } from "vitest";

const local: Record<string, unknown> = {};
const sync: Record<string, unknown> = {};

function area(values: Record<string, unknown>) {
  return {
    get(
      keys: string | string[] | null,
      callback: (result: Record<string, unknown>) => void,
    ) {
      const selected =
        keys === null
          ? values
          : Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys])
                .filter((key) => key in values)
                .map((key) => [key, values[key]]),
            );
      callback(selected);
    },
    set(data: Record<string, unknown>, callback: () => void) {
      Object.assign(values, data);
      callback();
    },
    remove(keys: string | string[], callback: () => void) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key];
      callback();
    },
  };
}

vi.stubGlobal("__UNSPLASH_ACCESS_KEY__", "bundled-key");
vi.stubGlobal("chrome", {
  runtime: { lastError: undefined },
  storage: { local: area(local), sync: area(sync) },
});

const {
  DEFAULT_PREFERENCES,
  getImageResolution,
  getImageSourceId,
  setDefaultExtensionSettings,
} = await import("../src/ts/settings");
const { resolveAccessKey } = await import(
  "../src/ts/sources/unsplash-settings"
);

beforeEach(() => {
  for (const key of Object.keys(local)) delete local[key];
  for (const key of Object.keys(sync)) delete sync[key];
});

describe("settings", () => {
  it("prefers a local user key and otherwise uses the bundled key", async () => {
    expect(await resolveAccessKey()).toBe("bundled-key");
    local.unsplashAccessKey = " user-key ";
    expect(await resolveAccessKey()).toBe("user-key");
  });

  it("fills missing synchronized defaults without overwriting preferences", async () => {
    sync.imageResolution = "high";
    await setDefaultExtensionSettings();
    expect(sync).toEqual({ ...DEFAULT_PREFERENCES, imageResolution: "high" });
    expect(local).toEqual({});
  });

  it("defaults invalid or missing image resolution to standard", async () => {
    expect(await getImageResolution()).toBe("standard");
    sync.imageResolution = "high";
    expect(await getImageResolution()).toBe("high");
    sync.imageResolution = "max";
    expect(await getImageResolution()).toBe("max");
    sync.imageResolution = "unexpected";
    expect(await getImageResolution()).toBe("standard");
  });

  it("resolves the internal source selection and its legacy value", async () => {
    expect(await getImageSourceId()).toBe("unsplash");
    sync.imageSource = "official";
    expect(await getImageSourceId()).toBe("unsplash");
    sync.imageSource = "future-source";
    expect(await getImageSourceId()).toBe("future-source");
  });
});
