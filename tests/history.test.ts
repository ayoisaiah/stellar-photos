import { describe, expect, it, vi } from "vitest";

import {
  decodeHistory,
  emptyHistory,
  UnsupportedHistoryVersionError,
} from "../src/ts/history";

describe("history schema", () => {
  it("distinguishes absent and supported empty state", () => {
    expect(decodeHistory(undefined)).toBeNull();
    expect(decodeHistory(emptyHistory())).toEqual(emptyHistory());
  });

  it("rejects malformed state", () => {
    expect(() => decodeHistory({ version: 1, history: "nope" })).toThrow(
      "Malformed",
    );
  });

  it("fails closed on a future schema", () => {
    expect(() => decodeHistory({ version: 3, history: [] })).toThrow(
      UnsupportedHistoryVersionError,
    );
  });

  it("upgrades legacy Unsplash records to source-owned payloads", () => {
    const state = decodeHistory({
      version: 1,
      currentId: "photo-1",
      history: [
        {
          id: "photo-1",
          cacheKey: "https://cache.stellar-photos.invalid/photo/photo-1",
          width: 1600,
          height: 900,
          color: "#123456",
          description: "A mountain",
          photographerName: "Ada",
          photographerUrl: "https://unsplash.com/@ada",
          unsplashUrl: "https://unsplash.com/photos/photo-1",
          downloadLocation: "https://api.unsplash.com/photos/photo-1/download",
          createdAt: 1,
        },
      ],
    });

    expect(state).toMatchObject({
      version: 2,
      history: [
        {
          sourceId: "unsplash",
          sourceAssetId: "photo-1",
          attribution: {
            name: "Ada",
            url: "https://unsplash.com/@ada",
            sourceUrl: "https://unsplash.com/photos/photo-1",
          },
          payloadVersion: 1,
          sourcePayload: {
            downloadLocation:
              "https://api.unsplash.com/photos/photo-1/download",
          },
        },
      ],
    });
  });

  it("drops only malformed legacy records", () => {
    const state = decodeHistory({
      version: 1,
      history: [
        { broken: true },
        {
          id: "photo-1",
          cacheKey: "https://cache.stellar-photos.invalid/photo/photo-1",
          width: 1600,
          height: 900,
          photographerName: "Ada",
          photographerUrl: "https://unsplash.com/@ada",
          unsplashUrl: "https://unsplash.com/photos/photo-1",
          downloadLocation: "https://api.unsplash.com/photos/photo-1/download",
          createdAt: 1,
        },
      ],
    });

    expect(state?.history).toHaveLength(1);
    expect(state?.history[0]?.sourceAssetId).toBe("photo-1");
  });

  it("handles history states with up to 10 entries", () => {
    const historyEntries = Array.from({ length: 10 }, (_, i) => ({
      sourceId: "unsplash",
      sourceAssetId: `photo-${i}`,
      cacheKey: `https://cache.stellar-photos.invalid/photo/photo-${i}`,
      width: 1920,
      height: 1080,
      color: "#000000",
      description: `Photo ${i}`,
      attribution: {
        name: `Photographer ${i}`,
        url: `https://unsplash.com/@photographer${i}`,
        sourceUrl: `https://unsplash.com/photos/photo-${i}`,
      },
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: Date.now(),
    }));

    const state = decodeHistory({
      version: 2,
      history: historyEntries,
    });

    expect(state?.history).toHaveLength(10);
    expect(state?.history[0]?.sourceAssetId).toBe("photo-0");
    expect(state?.history[9]?.sourceAssetId).toBe("photo-9");
  });
});

describe("promoteImage", () => {
  it("promotes an existing history item to index 0 and avoids duplicate entries", async () => {
    const { promoteImage } = await import("../src/ts/history");
    const localStore: Record<string, unknown> = {};

    vi.stubGlobal("chrome", {
      runtime: { lastError: undefined },
      storage: {
        local: {
          get: (
            keys: string | string[] | null,
            cb: (res: Record<string, unknown>) => void,
          ) => {
            const keyList = Array.isArray(keys) ? keys : [keys as string];
            const res: Record<string, unknown> = {};
            for (const k of keyList) {
              if (k in localStore) res[k] = localStore[k];
            }
            cb(res);
          },
          set: (data: Record<string, unknown>, cb: () => void) => {
            Object.assign(localStore, data);
            cb();
          },
        },
      },
    });

    const cacheMock = {
      match: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
    };
    vi.stubGlobal("caches", {
      open: vi.fn().mockResolvedValue(cacheMock),
      keys: vi.fn().mockResolvedValue([]),
    });

    const asset1 = {
      sourceId: "local",
      sourceAssetId: "photo-1",
      width: 100,
      height: 100,
      color: null,
      description: "Photo 1",
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: 1,
    };

    const asset2 = {
      sourceId: "local",
      sourceAssetId: "photo-2",
      width: 100,
      height: 100,
      color: null,
      description: "Photo 2",
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: 2,
    };

    const res1 = await promoteImage(asset1, new Response("img1"));
    expect(res1.history).toHaveLength(1);
    expect(res1.history[0]?.sourceAssetId).toBe("photo-1");

    const res2 = await promoteImage(asset2, new Response("img2"));
    expect(res2.history).toHaveLength(2);
    expect(res2.history[0]?.sourceAssetId).toBe("photo-2");
    expect(res2.history[1]?.sourceAssetId).toBe("photo-1");

    // Promoting asset1 again should move it to index 0 without duplicating it in history
    const res3 = await promoteImage(asset1, new Response("img1"));
    expect(res3.history).toHaveLength(2);
    expect(res3.history[0]?.sourceAssetId).toBe("photo-1");
    expect(res3.history[1]?.sourceAssetId).toBe("photo-2");
  });

  it("purges all photos matching folderId from history", async () => {
    const { purgeFolderFromHistory } = await import("../src/ts/history");
    const localStore: Record<string, unknown> = {};

    vi.stubGlobal("chrome", {
      runtime: { lastError: undefined },
      storage: {
        local: {
          get: (
            keys: string | string[] | null,
            cb: (res: Record<string, unknown>) => void,
          ) => {
            const keyList = Array.isArray(keys) ? keys : [keys as string];
            const res: Record<string, unknown> = {};
            for (const k of keyList) {
              if (k in localStore) res[k] = localStore[k];
            }
            cb(res);
          },
          set: (data: Record<string, unknown>, cb: () => void) => {
            Object.assign(localStore, data);
            cb();
          },
        },
      },
    });

    const cacheMock = {
      match: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
    };
    vi.stubGlobal("caches", {
      open: vi.fn().mockResolvedValue(cacheMock),
      keys: vi.fn().mockResolvedValue([]),
    });

    const { promoteImage } = await import("../src/ts/history");

    await promoteImage(
      {
        sourceId: "local",
        sourceAssetId: "f1_photo1",
        width: 100,
        height: 100,
        color: null,
        description: "Photo 1",
        attribution: null,
        payloadVersion: 1,
        sourcePayload: { folderId: "folder-1" },
        createdAt: 1,
      },
      new Response("img1"),
    );

    await promoteImage(
      {
        sourceId: "local",
        sourceAssetId: "f2_photo2",
        width: 100,
        height: 100,
        color: null,
        description: "Photo 2",
        attribution: null,
        payloadVersion: 1,
        sourcePayload: { folderId: "folder-2" },
        createdAt: 2,
      },
      new Response("img2"),
    );

    await purgeFolderFromHistory("folder-1");

    const state = await (await import("../src/ts/history")).readHistory();
    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.sourceAssetId).toBe("f2_photo2");
    expect(cacheMock.delete).toHaveBeenCalled();
  });
});
