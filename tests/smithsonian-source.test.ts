import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  setSmithsonianCategory,
  smithsonianSource,
} from "../src/ts/sources/smithsonian";

const sync: Record<string, unknown> = {};

beforeEach(() => {
  for (const key of Object.keys(sync)) delete sync[key];

  vi.stubGlobal("__SMITHSONIAN_API_KEY__", "smithsonian-key");
  vi.stubGlobal("chrome", {
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: sync[key] }),
        set: (values: Record<string, unknown>) => {
          Object.assign(sync, values);
          return Promise.resolve();
        },
      },
    },
  });
});

describe("smithsonian source", () => {
  it("finds and downloads a random CC0 image", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              rows: [
                {
                  id: "invalid",
                  content: {
                    descriptiveNonRepeating: {
                      online_media: {
                        media: [
                          {
                            content: "https://example.com/image.jpg",
                            type: "Images",
                            usage: { access: "CC0" },
                          },
                        ],
                      },
                    },
                  },
                },
                {
                  id: "edanmdm:saam_1969.47.61",
                  title: "Aurora Borealis",
                  url: "https://airandspace.si.edu/object/aurora",
                  content: {
                    descriptiveNonRepeating: {
                      record_link: "https://airandspace.si.edu/object/aurora",
                      online_media: {
                        media: [
                          {
                            content:
                              "https://ids.si.edu/ids/deliveryService?id=SAAM-1969.47.61",
                            resources: [
                              {
                                label: "High-resolution JPEG",
                                width: 1600,
                                height: 2400,
                              },
                            ],
                            type: "Images",
                            usage: { access: "CC0" },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response("image-bytes", {
          headers: { "content-type": "image/jpeg" },
        }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const asset = await smithsonianSource.getRandomAsset();
    const response = await smithsonianSource.downloadAsset(asset);

    expect(asset).toMatchObject({
      sourceId: "smithsonian",
      sourceAssetId: "edanmdm:saam_1969.47.61",
      width: 1600,
      height: 2400,
      description: "Aurora Borealis",
      attribution: {
        name: "Smithsonian Open Access",
        url: "https://www.si.edu/openaccess",
        sourceUrl: "https://airandspace.si.edu/object/aurora",
      },
    });
    expect(mockFetch.mock.calls[0]?.[0].toString()).toContain(
      "api.si.edu/openaccess/api/v1.0/category/art_design/search",
    );
    expect(mockFetch.mock.calls[0]?.[0].toString()).toContain("sort=random");
    expect(mockFetch.mock.calls[1]?.[0]).toEqual(
      new URL("https://ids.si.edu/ids/deliveryService?id=SAAM-1969.47.61"),
    );
    expect(await response.text()).toBe("image-bytes");
  });

  it("rejects records without reusable image media", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ response: { rows: [] } }), {
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(smithsonianSource.getRandomAsset()).rejects.toThrow(
      "Smithsonian returned no usable images",
    );
  });

  it("searches all categories when configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ response: { rows: [] } }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    await setSmithsonianCategory("all");
    await expect(smithsonianSource.getRandomAsset()).rejects.toThrow(
      "Smithsonian returned no usable images",
    );

    expect(mockFetch.mock.calls[0]?.[0].pathname).toBe(
      "/openaccess/api/v1.0/search",
    );
  });

  it("respects its stored photo frequency", async () => {
    sync["sourceSettings:smithsonian"] = {
      version: 1,
      photoFrequency: "everyhour",
    };
    const asset = {
      sourceId: "smithsonian",
      sourceAssetId: "item",
      cacheKey: "cache-key",
      width: 2400,
      height: 1600,
      color: null,
      description: null,
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: Date.now() - 30 * 60 * 1000,
    };

    await expect(smithsonianSource.shouldRotate?.(asset)).resolves.toBe(false);
  });

  it("falls back to default dimensions when metadata lacks width or height", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            response: {
              rows: [
                {
                  id: "item-no-dimensions",
                  content: {
                    descriptiveNonRepeating: {
                      online_media: {
                        media: [
                          {
                            content:
                              "https://ids.si.edu/ids/deliveryService?id=item-1",
                            type: "Images",
                            usage: { access: "CC0" },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const asset = await smithsonianSource.getRandomAsset();
    expect(asset.width).toBeGreaterThan(0);
    expect(asset.height).toBeGreaterThan(0);
  });

  it("resolves relative and http record links to canonical https URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            response: {
              rows: [
                {
                  id: "item-relative-link",
                  content: {
                    descriptiveNonRepeating: {
                      record_link: "/object/saam_1969.47.61",
                      online_media: {
                        media: [
                          {
                            content:
                              "https://ids.si.edu/ids/deliveryService?id=item-1",
                            type: "Images",
                            usage: { access: "CC0" },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const asset = await smithsonianSource.getRandomAsset();
    expect(asset.attribution?.sourceUrl).toBe(
      "https://www.si.edu/object/saam_1969.47.61",
    );
  });
});
