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
  CORE_SETTINGS_KEY,
  DEFAULT_CORE_SETTINGS,
  getImageSourceId,
  initializeCoreSettings,
  setImageSourceId,
} = await import("../src/ts/settings");
const {
  DEFAULT_UNSPLASH_SETTINGS,
  getImageQuality,
  getPhotoFrequency,
  initializeUnsplashSettings,
  resolveAccessKey,
  setImageQuality,
  setPhotoFrequency,
  UNSPLASH_SETTINGS_KEY,
} = await import("../src/ts/sources/unsplash-settings");

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

  it("migrates legacy root settings into owned records", async () => {
    sync.imageSource = "official";
    sync.imageResolution = "high";
    sync.photoFrequency = "everyhour";
    local.unsplashAccessKey = " user-key ";

    await initializeCoreSettings();
    await initializeUnsplashSettings();

    expect(sync).toEqual({
      [CORE_SETTINGS_KEY]: {
        ...DEFAULT_CORE_SETTINGS,
        activeSourceId: "unsplash",
      },
      [UNSPLASH_SETTINGS_KEY]: {
        ...DEFAULT_UNSPLASH_SETTINGS,
        imageQuality: "high",
        photoFrequency: "everyhour",
      },
    });
    expect(local).toEqual({
      [UNSPLASH_SETTINGS_KEY]: {
        version: 1,
        accessKeyOverride: "user-key",
      },
    });
  });

  it("preserves existing namespaced settings while removing legacy keys", async () => {
    sync[CORE_SETTINGS_KEY] = {
      version: 1,
      activeSourceId: "future-source",
    };
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "max",
      photoFrequency: "everyday",
    };
    sync.imageSource = "official";
    sync.imageResolution = "high";
    sync.photoFrequency = "newtab";
    local[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      accessKeyOverride: "current-key",
    };
    local.unsplashAccessKey = "legacy-key";

    await initializeCoreSettings();
    await initializeUnsplashSettings();

    expect(sync).toEqual({
      [CORE_SETTINGS_KEY]: {
        version: 1,
        activeSourceId: "future-source",
      },
      [UNSPLASH_SETTINGS_KEY]: {
        version: 1,
        imageQuality: "max",
        photoFrequency: "everyday",
      },
    });
    expect(local).toEqual({
      [UNSPLASH_SETTINGS_KEY]: {
        version: 1,
        accessKeyOverride: "current-key",
      },
    });
  });

  it("does not overwrite settings written by a newer schema", async () => {
    sync[CORE_SETTINGS_KEY] = { version: 2, activeSourceId: "future-source" };

    await expect(initializeCoreSettings()).rejects.toThrow(
      "Unsupported core settings version: 2",
    );
    expect(sync[CORE_SETTINGS_KEY]).toEqual({
      version: 2,
      activeSourceId: "future-source",
    });

    delete sync[CORE_SETTINGS_KEY];
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 2,
      imageQuality: "future",
      photoFrequency: "future",
    };

    await expect(initializeUnsplashSettings()).rejects.toThrow(
      "Unsupported Unsplash settings version: 2",
    );
    expect(sync[UNSPLASH_SETTINGS_KEY]).toEqual({
      version: 2,
      imageQuality: "future",
      photoFrequency: "future",
    });
  });

  it("defaults invalid or missing image resolution to standard", async () => {
    expect(await getImageQuality()).toBe("standard");
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "high",
      photoFrequency: "newtab",
    };
    expect(await getImageQuality()).toBe("high");
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "max",
      photoFrequency: "newtab",
    };
    expect(await getImageQuality()).toBe("max");
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "unexpected",
      photoFrequency: "newtab",
    };
    expect(await getImageQuality()).toBe("standard");
  });

  it("defaults invalid or missing photo frequency to newtab", async () => {
    expect(await getPhotoFrequency()).toBe("newtab");
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "standard",
      photoFrequency: "every15minutes",
    };
    expect(await getPhotoFrequency()).toBe("every15minutes");
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "standard",
      photoFrequency: "everyhour",
    };
    expect(await getPhotoFrequency()).toBe("everyhour");
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "standard",
      photoFrequency: "everyday",
    };
    expect(await getPhotoFrequency()).toBe("everyday");
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      imageQuality: "standard",
      photoFrequency: "unexpected",
    };
    expect(await getPhotoFrequency()).toBe("newtab");
  });

  it("resolves the internal source selection and its legacy value", async () => {
    expect(await getImageSourceId()).toBe("unsplash");
    sync[CORE_SETTINGS_KEY] = { version: 1, activeSourceId: "official" };
    expect(await getImageSourceId()).toBe("unsplash");
    sync[CORE_SETTINGS_KEY] = {
      version: 1,
      activeSourceId: "future-source",
    };
    expect(await getImageSourceId()).toBe("future-source");
  });

  it("persists source-owned and application-owned settings", async () => {
    await setImageQuality("max");
    await setPhotoFrequency("everyday");
    await setImageSourceId("unsplash");

    expect(sync).toEqual({
      [CORE_SETTINGS_KEY]: {
        version: 1,
        activeSourceId: "unsplash",
      },
      [UNSPLASH_SETTINGS_KEY]: {
        version: 1,
        imageQuality: "max",
        photoFrequency: "everyday",
      },
    });
  });
});
