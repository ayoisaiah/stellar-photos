import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import {
  buildEarthViewImageUrl,
  earthviewSource,
  getEarthViewCatalog,
} from "../src/ts/sources/earthview";
import {
  DEFAULT_EARTHVIEW_SETTINGS,
  EARTHVIEW_SETTINGS_KEY,
  getEarthViewPhotoFrequency,
  getEarthViewSettings,
  setEarthViewPhotoFrequency,
  setEarthViewSettings,
} from "../src/ts/sources/earthview-settings";

const sync: Record<string, unknown> = {};

beforeEach(() => {
  for (const key of Object.keys(sync)) {
    delete sync[key];
  }

  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      sync: {
        get: (
          keys: string | string[] | null,
          cb?: (res: Record<string, unknown>) => void,
        ) => {
          const keyList = Array.isArray(keys) ? keys : [keys as string];
          const res: Record<string, unknown> = {};
          for (const k of keyList) {
            if (k in sync) res[k] = sync[k];
          }
          if (cb) cb(res);
          return Promise.resolve(res);
        },
        set: (data: Record<string, unknown>, cb?: () => void) => {
          Object.assign(sync, data);
          if (cb) cb();
          return Promise.resolve();
        },
      },
    },
  });
});

describe("earthview catalog and image helper", () => {
  it("provides a curated catalog of Earth View photos", async () => {
    const catalog = await getEarthViewCatalog();
    expect(catalog.length).toBeGreaterThan(1000);
    expect(catalog[0]).toMatchObject({
      id: expect.any(Number),
      country: expect.any(String),
      map: expect.stringContaining("google.com/maps"),
    });
  });

  it("builds the correct gstatic image URL", () => {
    expect(buildEarthViewImageUrl(1003)).toBe(
      "https://www.gstatic.com/prettyearth/assets/full/1003.jpg",
    );
    expect(buildEarthViewImageUrl("2000")).toBe(
      "https://www.gstatic.com/prettyearth/assets/full/2000.jpg",
    );
  });
});

describe("earthview settings", () => {
  it("defaults settings and allows updates", async () => {
    expect(await getEarthViewSettings()).toEqual(DEFAULT_EARTHVIEW_SETTINGS);

    await setEarthViewPhotoFrequency("everyhour");
    expect(await getEarthViewPhotoFrequency()).toBe("everyhour");

    const raw = sync[EARTHVIEW_SETTINGS_KEY] as Record<string, unknown>;
    expect(raw.photoFrequency).toBe("everyhour");
  });

  it("handles partial settings updates", async () => {
    await setEarthViewSettings({ photoFrequency: "everyday" });
    expect(await getEarthViewPhotoFrequency()).toBe("everyday");
  });
});

describe("earthview source retrieval and rotation", () => {
  it("retrieves a random Earth View asset", async () => {
    const asset = await earthviewSource.getRandomAsset();

    expect(asset.sourceId).toBe("earthview");
    expect(asset.sourceAssetId).toMatch(/^[0-9]+$/);
    expect(asset.attribution?.name).toBeTruthy();
    expect(asset.attribution?.url).toContain("google.com/maps");
    expect(asset.attribution?.sourceUrl).toBe("https://earth.google.com/");
    expect(asset.sourcePayload).toMatchObject({
      id: expect.any(Number),
      imageUrl: expect.stringContaining("gstatic.com/prettyearth"),
    });
  });

  it("downloads asset from gstatic", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("image-bytes", {
        headers: { "content-type": "image/jpeg" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const asset = await earthviewSource.getRandomAsset();
    const response = await earthviewSource.downloadAsset(asset);

    expect(mockFetch).toHaveBeenCalledWith(
      new URL(
        `https://www.gstatic.com/prettyearth/assets/full/${asset.sourceAssetId}.jpg`,
      ),
      expect.objectContaining({ redirect: "follow" }),
    );
    expect(await response.text()).toBe("image-bytes");
  });

  it("evaluates shouldRotate based on frequency setting", async () => {
    await setEarthViewPhotoFrequency("every15minutes");

    const asset: BackgroundAsset = {
      sourceId: "earthview",
      sourceAssetId: "1003",
      cacheKey: "cache-key",
      width: 1800,
      height: 1200,
      color: null,
      description: "Earth View",
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    };

    expect(await earthviewSource.shouldRotate!(asset)).toBe(false);

    // 20 minutes ago -> should rotate
    const olderAsset = {
      ...asset,
      createdAt: Date.now() - 20 * 60 * 1000,
    };
    expect(await earthviewSource.shouldRotate!(olderAsset)).toBe(true);

    // Frequency = newtab -> always rotates
    await setEarthViewPhotoFrequency("newtab");
    expect(await earthviewSource.shouldRotate!(asset)).toBe(true);
  });
});
