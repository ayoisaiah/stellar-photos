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
  coreStore,
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  displayStore,
} = await import("../src/ts/settings");
const {
  DEFAULT_UNSPLASH_SETTINGS,
  getUnsplashAccessKey,
  getUnsplashSettings,
  resolveAccessKey,
  setUnsplashAccessKey,
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
    expect(await getUnsplashAccessKey()).toBe("");
    expect(await resolveAccessKey()).toBe("bundled-key");

    await setUnsplashAccessKey("user-key");
    expect(await getUnsplashAccessKey()).toBe("user-key");
    expect(await resolveAccessKey()).toBe("user-key");

    await setUnsplashAccessKey("");
    expect(await getUnsplashAccessKey()).toBe("");
    expect(await resolveAccessKey()).toBe("bundled-key");
  });

  it("returns lazy defaults without writing storage", async () => {
    expect(await coreStore.get()).toEqual(DEFAULT_CORE_SETTINGS);
    expect(await displayStore.get()).toEqual(DEFAULT_DISPLAY_SETTINGS);
    expect(await getUnsplashSettings()).toEqual(DEFAULT_UNSPLASH_SETTINGS);
    expect(sync).toEqual({});
  });

  it("updates core settings via coreStore.set", async () => {
    await coreStore.set({
      activeSourceIds: ["smithsonian"],
      photoFrequency: "everyday",
    });
    expect(await coreStore.get()).toEqual({
      version: 1,
      activeSourceIds: ["smithsonian"],
      photoFrequency: "everyday",
    });
  });

  it("falls back to defaults when settings are written by a newer schema", async () => {
    sync[coreStore.key] = {
      version: 2,
      activeSourceIds: ["future-source"],
    };

    expect(await coreStore.get()).toEqual(DEFAULT_CORE_SETTINGS);

    delete sync[coreStore.key];
    sync[UNSPLASH_SETTINGS_KEY] = {
      version: 2,
      imageQuality: "future",
    };

    expect(await getUnsplashSettings()).toEqual(DEFAULT_UNSPLASH_SETTINGS);
  });

  it("defaults invalid or missing image resolution to standard", async () => {
    expect((await getUnsplashSettings()).imageQuality).toBe("standard");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "high",
    };
    expect((await getUnsplashSettings()).imageQuality).toBe("high");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "max",
    };
    expect((await getUnsplashSettings()).imageQuality).toBe("max");
    sync[UNSPLASH_SETTINGS_KEY] = {
      ...DEFAULT_UNSPLASH_SETTINGS,
      imageQuality: "unexpected",
    };
    expect((await getUnsplashSettings()).imageQuality).toBe("standard");
  });

  it("defaults invalid or missing photo frequency to newtab", async () => {
    expect((await coreStore.get()).photoFrequency).toBe("newtab");
    sync[coreStore.key] = {
      version: 1,
      activeSourceIds: ["unsplash"],
      photoFrequency: "every15minutes",
    };
    expect((await coreStore.get()).photoFrequency).toBe("every15minutes");
    sync[coreStore.key] = {
      version: 1,
      activeSourceIds: ["unsplash"],
      photoFrequency: "everyhour",
    };
    expect((await coreStore.get()).photoFrequency).toBe("everyhour");
    sync[coreStore.key] = {
      version: 1,
      activeSourceIds: ["unsplash"],
      photoFrequency: "everyday",
    };
    expect((await coreStore.get()).photoFrequency).toBe("everyday");
    sync[coreStore.key] = {
      version: 1,
      activeSourceIds: ["unsplash"],
      photoFrequency: "unexpected",
    };
    expect((await coreStore.get()).photoFrequency).toBe("newtab");
  });

  it("persists source-owned and application-owned settings", async () => {
    await setUnsplashSettings({
      imageQuality: "max",
    });
    await coreStore.set({
      activeSourceIds: ["unsplash", "earthview"],
      photoFrequency: "everyday",
    });

    expect(sync).toEqual({
      [coreStore.key]: {
        version: 1,
        activeSourceIds: ["unsplash", "earthview"],
        photoFrequency: "everyday",
      },
      [UNSPLASH_SETTINGS_KEY]: {
        ...DEFAULT_UNSPLASH_SETTINGS,
        imageQuality: "max",
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

  it("defaults and updates display customization settings", async () => {
    expect(await displayStore.get()).toEqual(DEFAULT_DISPLAY_SETTINGS);

    await displayStore.set({
      landscapeMode: "contain-blur",
      portraitMode: "cover",
    });

    expect(await displayStore.get()).toEqual({
      version: 1,
      landscapeMode: "contain-blur",
      portraitMode: "cover",
      motion: false,
    });
    expect(sync[displayStore.key]).toEqual({
      version: 1,
      landscapeMode: "contain-blur",
      portraitMode: "cover",
      motion: false,
    });

    await displayStore.set({
      motion: true,
    });

    expect(await displayStore.get()).toEqual({
      version: 1,
      landscapeMode: "contain-blur",
      portraitMode: "cover",
      motion: true,
    });
    expect(sync[displayStore.key]).toEqual({
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
