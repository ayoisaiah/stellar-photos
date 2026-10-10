import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import {
  buildEarthViewImageUrl,
  earthviewSource,
  fetchEarthViewDetails,
} from "../src/ts/sources/earthview";

describe("earthview catalog and image helper", () => {
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
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("image", { headers: { "content-type": "image/jpeg" } }),
        ),
    );
    const { asset } = await earthviewSource.fetchRandom();

    expect(asset.sourceId).toBe("earthview");
    expect(asset.sourceAssetId).toMatch(/^[0-9]+$/);
    expect(asset.attribution?.name).toBeTruthy();
    expect(asset.attribution?.url).toBe("https://earth.google.com/");
    expect(asset.attribution?.sourceUrl).toBe("https://earth.google.com/");
    expect(asset.sourcePayload).toMatchObject({
      id: expect.any(Number),
    });
  });

  it("downloads asset from gstatic", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("image-bytes", {
        headers: { "content-type": "image/jpeg" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { asset, blob: response } = await earthviewSource.fetchRandom();

    expect(mockFetch).toHaveBeenCalledWith(
      new URL(
        `https://www.gstatic.com/prettyearth/assets/full/${asset.sourceAssetId}.jpg`,
      ),
      expect.objectContaining({ redirect: "follow" }),
    );
    expect(await response.text()).toBe("image-bytes");
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
