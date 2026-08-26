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
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_KEY,
  getDisplaySettings,
  getImageSourceId,
  initializeCoreSettings,
  initializeDisplaySettings,
  setDisplaySettings,
  setImageSourceId,
} = await import("../src/ts/settings");
const {
  DEFAULT_UNSPLASH_SETTINGS,
  getImageQuality,
  getPhotoFrequency,
  getUnsplashSettings,
  initializeUnsplashSettings,
  resolveAccessKey,
  setImageQuality,
  setPhotoFrequency,
  setUnsplashSettings,
  UNSPLASH_SETTINGS_KEY,
} = await import("../src/ts/sources/unsplash-settings");
const { PAUSED_STORAGE_KEY, readPaused, writePaused } = await import(
  "../src/ts/storage"
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

  it("migrates legacy root settings into owned records", async () => {
    sync.imageSource = "official";
    sync.imageResolution = "high";
    sync.photoFrequency = "everyhour";
    sync.collections = "12345, 67890";
    local.unsplashAccessKey = " user-key ";

    await initializeCoreSettings();
    await initializeUnsplashSettings();

    expect(sync).toEqual({
      [CORE_SETTINGS_KEY]: {
        ...DEFAULT_CORE_SETTINGS,
        activeSourceId: "unsplash",
      },
      [DISPLAY_SETTINGS_KEY]: DEFAULT_DISPLAY_SETTINGS,
      [UNSPLASH_SETTINGS_KEY]: {
        ...DEFAULT_UNSPLASH_SETTINGS,
        imageQuality: "high",
        photoFrequency: "everyhour",
        collections: "12345, 67890",
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
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "max",
      photoFrequency: "everyday",
      query: "astronomy",
    };
    sync.imageSource = "official";
    sync.imageResolution = "high";
    sync.photoFrequency = "newtab";
    sync.collections = "old-collection";
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
      [DISPLAY_SETTINGS_KEY]: DEFAULT_DISPLAY_SETTINGS,
      [UNSPLASH_SETTINGS_KEY]: {
        ...DEFAULT_UNSPLASH_SETTINGS,
        imageQuality: "max",
        photoFrequency: "everyday",
        query: "astronomy",
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
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "high",
    };
    expect(await getImageQuality()).toBe("high");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "max",
    };
    expect(await getImageQuality()).toBe("max");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "unexpected",
    };
    expect(await getImageQuality()).toBe("standard");
  });

  it("defaults invalid or missing photo frequency to newtab", async () => {
    expect(await getPhotoFrequency()).toBe("newtab");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      photoFrequency: "every15minutes",
    };
    expect(await getPhotoFrequency()).toBe("every15minutes");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      photoFrequency: "everyhour",
    };
    expect(await getPhotoFrequency()).toBe("everyhour");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      photoFrequency: "everyday",
    };
    expect(await getPhotoFrequency()).toBe("everyday");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
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
        ...DEFAULT_UNSPLASH_SETTINGS,
        imageQuality: "max",
        photoFrequency: "everyday",
      },
    });
  });

  it("persists and retrieves custom photo filters", async () => {
    await setUnsplashSettings({
      query: "galaxy",
      topics: "nature,wallpapers",
      username: "nasa",
      orientation: "landscape",
      contentFilter: "high",
    });

    expect(await getUnsplashSettings()).toMatchObject({
      query: "galaxy",
      topics: "nature,wallpapers",
      username: "nasa",
      orientation: "landscape",
      contentFilter: "high",
    });
  });

  it("initializes and updates display customization settings", async () => {
    await initializeDisplaySettings();
    expect(await getDisplaySettings()).toEqual(DEFAULT_DISPLAY_SETTINGS);

    await setDisplaySettings({
      landscapeMode: "contain-blur",
      portraitMode: "cover",
    });

    expect(await getDisplaySettings()).toEqual({
      version: 1,
      landscapeMode: "contain-blur",
      portraitMode: "cover",
      motion: false,
    });
    expect(sync[DISPLAY_SETTINGS_KEY]).toEqual({
      version: 1,
      landscapeMode: "contain-blur",
      portraitMode: "cover",
      motion: false,
    });

    await setDisplaySettings({
      motion: true,
    });

    expect(await getDisplaySettings()).toEqual({
      version: 1,
      landscapeMode: "contain-blur",
      portraitMode: "cover",
      motion: true,
    });
    expect(sync[DISPLAY_SETTINGS_KEY]).toEqual({
      version: 1,
      landscapeMode: "contain-blur",
      portraitMode: "cover",
      motion: true,
    });
  });

  it("reads and writes the paused rotation state with legacy fallback", async () => {
    expect(await readPaused()).toBe(false);

    await writePaused(true);
    expect(await readPaused()).toBe(true);
    expect(local[PAUSED_STORAGE_KEY]).toBe(true);

    await writePaused(false);
    expect(await readPaused()).toBe(false);
    expect(local[PAUSED_STORAGE_KEY]).toBe(false);

    delete local[PAUSED_STORAGE_KEY];
    local.imagePaused = true;
    expect(await readPaused()).toBe(true);
  });
});
