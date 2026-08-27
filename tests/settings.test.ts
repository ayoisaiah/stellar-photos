import { beforeEach, describe, expect, it, vi } from "vitest";

const local: Record<string, unknown> = {};
const sync: Record<string, unknown> = {};

function area(values: Record<string, unknown>) {
  return {
    get(
      keys: string | string[] | null,
      callback?: (result: Record<string, unknown>) => void,
    ) {
      const selected =
        keys === null
          ? values
          : Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys])
                .filter((key) => key in values)
                .map((key) => [key, values[key]]),
            );
      if (callback) callback(selected);
      return Promise.resolve(selected);
    },
    set(data: Record<string, unknown>, callback?: () => void) {
      Object.assign(values, data);
      if (callback) callback();
      return Promise.resolve();
    },
    remove(keys: string | string[], callback?: () => void) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key];
      if (callback) callback();
      return Promise.resolve();
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
const {
  HISTORY_STORAGE_KEY,
  PINNED_STORAGE_KEY,
  readHistory,
  readPinnedAsset,
  writeHistory,
  writePinnedAsset,
} = await import("../src/ts/storage");

beforeEach(() => {
  for (const key of Object.keys(local)) delete local[key];
  for (const key of Object.keys(sync)) delete sync[key];
});

describe("settings", () => {
  it("prefers a local user key and otherwise uses the bundled key", async () => {
    expect(await resolveAccessKey()).toBe("bundled-key");
    local[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      accessKeyOverride: "user-key",
    };
    expect(await resolveAccessKey()).toBe("user-key");
  });

  it("initializes default settings when storage is empty", async () => {
    await initializeCoreSettings();
    await initializeUnsplashSettings();

    expect(sync).toEqual({
      [CORE_SETTINGS_KEY]: DEFAULT_CORE_SETTINGS,
      [DISPLAY_SETTINGS_KEY]: DEFAULT_DISPLAY_SETTINGS,
      [UNSPLASH_SETTINGS_KEY]: DEFAULT_UNSPLASH_SETTINGS,
    });
  });

  it("preserves existing settings on initialization", async () => {
    sync[CORE_SETTINGS_KEY] = {
      version: 1,
      activeSourceId: "local",
    };
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "max",
      photoFrequency: "everyday",
      query: "astronomy",
    };

    await initializeCoreSettings();
    await initializeUnsplashSettings();

    expect(sync[CORE_SETTINGS_KEY]).toEqual({
      version: 1,
      activeSourceId: "local",
    });
    expect(sync[UNSPLASH_SETTINGS_KEY]).toEqual({
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "max",
      photoFrequency: "everyday",
      query: "astronomy",
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

  it("reads and writes the pinned asset", async () => {
    const pinnedAsset = {
      sourceId: "unsplash",
      sourceAssetId: "pinned-photo",
      cacheKey: "pinned-cache",
      width: 100,
      height: 100,
      color: null,
      description: null,
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: 1,
    };

    expect(await readPinnedAsset()).toBeNull();

    await writePinnedAsset(pinnedAsset);
    expect(await readPinnedAsset()).toEqual(pinnedAsset);
    expect(local[PINNED_STORAGE_KEY]).toEqual(pinnedAsset);

    await writePinnedAsset(null);
    expect(await readPinnedAsset()).toBeNull();
    expect(local[PINNED_STORAGE_KEY]).toBeNull();
  });

  it("safely reads history with boundary validation and length caps", async () => {
    expect(await readHistory()).toEqual({ history: [] });

    local[HISTORY_STORAGE_KEY] = "malformed-string";
    expect(await readHistory()).toEqual({ history: [] });

    local[HISTORY_STORAGE_KEY] = { history: "not-an-array" };
    expect(await readHistory()).toEqual({ history: [] });

    const fifteenItems = Array.from({ length: 15 }, (_, i) => ({
      sourceId: "unsplash",
      sourceAssetId: `photo-${i}`,
      cacheKey: `cache-${i}`,
      width: 100,
      height: 100,
      color: null,
      description: null,
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: i,
    }));
    local[HISTORY_STORAGE_KEY] = { history: fifteenItems };

    const state = await readHistory();
    expect(state.history).toHaveLength(10);
    expect(state.history[0]?.sourceAssetId).toBe("photo-0");
    expect(state.history[9]?.sourceAssetId).toBe("photo-9");

    await writeHistory({ history: fifteenItems.slice(0, 3) });
    expect(await readHistory()).toEqual({ history: fifteenItems.slice(0, 3) });
  });

  it("reconciles history index by cacheKey and createdAt, handling detached states", () => {
    const history = [
      { cacheKey: "key-a", createdAt: 100 },
      { cacheKey: "key-b", createdAt: 90 },
      { cacheKey: "key-c", createdAt: 80 },
    ];

    const currentAttached = { cacheKey: "key-b", createdAt: 90 };
    const indexAttached = history.findIndex(
      (item) =>
        item.cacheKey === currentAttached.cacheKey &&
        item.createdAt === currentAttached.createdAt,
    );
    expect(indexAttached).toBe(1);

    const duplicateKeyDifferentTime = { cacheKey: "key-b", createdAt: 50 };
    const indexDuplicateOld = history.findIndex(
      (item) =>
        item.cacheKey === duplicateKeyDifferentTime.cacheKey &&
        item.createdAt === duplicateKeyDifferentTime.createdAt,
    );
    expect(indexDuplicateOld).toBe(-1);

    const currentDetached = { cacheKey: "key-z", createdAt: 10 };
    const indexDetached = history.findIndex(
      (item) =>
        item.cacheKey === currentDetached.cacheKey &&
        item.createdAt === currentDetached.createdAt,
    );
    expect(indexDetached).toBe(-1);
  });
});
