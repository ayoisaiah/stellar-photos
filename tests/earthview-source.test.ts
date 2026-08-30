import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import {
  buildEarthViewImageUrl,
  EARTHVIEW_SETTINGS_KEY,
  earthviewSource,
  fetchEarthViewDetails,
  getEarthViewPhotoIds,
} from "../src/ts/sources/earthview";

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
  it("provides a curated list of Earth View photo IDs", () => {
    const ids = getEarthViewPhotoIds();
    expect(ids.length).toBeGreaterThan(1000);
    expect(ids[0]).toBe(1003);
    expect(new Set(ids).size).toBe(ids.length);
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

describe("earthview source retrieval and rotation", () => {
  it("retrieves a random Earth View asset", async () => {
    const asset = await earthviewSource.getRandomAsset();

    expect(asset.sourceId).toBe("earthview");
    expect(asset.sourceAssetId).toMatch(/^[0-9]+$/);
    expect(asset.attribution?.name).toBeTruthy();
    expect(asset.attribution?.url).toBe("https://earth.google.com/");
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
    sync[EARTHVIEW_SETTINGS_KEY] = {
      version: 1,
      photoFrequency: "every15minutes",
    };

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
    sync[EARTHVIEW_SETTINGS_KEY] = { version: 1, photoFrequency: "newtab" };
    expect(await earthviewSource.shouldRotate!(asset)).toBe(true);
  });

  it("rejects unsupported settings versions", async () => {
    sync[EARTHVIEW_SETTINGS_KEY] = { version: 2 };
    const asset: BackgroundAsset = {
      sourceId: "earthview",
      sourceAssetId: "1003",
      cacheKey: "cache-key",
      width: 1800,
      height: 1200,
      color: null,
      description: null,
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: Date.now(),
    };

    await expect(earthviewSource.shouldRotate!(asset)).rejects.toThrow(
      "Unsupported source settings version: 2",
    );
  });

  it("fetches Earth View satellite metadata details", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "1004",
          lat: -19.140249,
          lng: -68.683995,
          zoom: 14,
          elevation: 5253.089,
          geocode: {
            establishment: "Volcán Isluga National Park",
            country: "Chile",
          },
          attribution: "©2019 CNES / Astrium",
        }),
        {
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    const asset: BackgroundAsset = {
      sourceId: "earthview",
      sourceAssetId: "1004",
      cacheKey: "cache-key-1004",
      width: 1800,
      height: 1200,
      color: null,
      description: "Chile",
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: Date.now(),
    };

    const details = await fetchEarthViewDetails(asset);
    expect(details).not.toBeNull();
    expect(details?.lat).toBe(-19.140249);
    expect(details?.lng).toBe(-68.683995);
    expect(details?.elevation).toBeCloseTo(5253.089);
    expect(details?.geocode?.establishment).toBe("Volcán Isluga National Park");
    expect(details?.attribution).toBe("©2019 CNES / Astrium");
  });
});
