import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  setSmithsonianCategory,
  smithsonianSource,
} from "../src/ts/sources/smithsonian";

const sync: Record<string, unknown> = {};
const local: Record<string, unknown> = {};

beforeEach(() => {
  for (const key of Object.keys(sync)) delete sync[key];
  for (const key of Object.keys(local)) delete local[key];

  vi.stubGlobal("__SMITHSONIAN_API_KEY__", "smithsonian-key");
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: (keys: string | string[]) => {
          if (typeof keys === "string") {
            return Promise.resolve({ [keys]: local[keys] });
          }
          if (Array.isArray(keys)) {
            return Promise.resolve(
              Object.fromEntries(keys.map((k) => [k, local[k]])),
            );
          }
          return Promise.resolve({ ...local });
        },
        set: (values: Record<string, unknown>) => {
          Object.assign(local, values);
          return Promise.resolve();
        },
      },
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
                  id: "edanmdm:saam_1969.47.61",
                  title: "Aurora Borealis",
                  url: "https://airandspace.si.edu/object/aurora",
                  content: {
                    descriptiveNonRepeating: {
                      record_link: "https://airandspace.si.edu/object/aurora",
                      online_media: {
                        media: [
                          {
                            content: "https://images.example.com/aurora.jpg",
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

    const { asset, blob: response } = await smithsonianSource.fetchRandom();

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
      new URL("https://images.example.com/aurora.jpg"),
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

    await expect(smithsonianSource.fetchRandom()).rejects.toThrow(
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
    await expect(smithsonianSource.fetchRandom()).rejects.toThrow(
      "Smithsonian returned no usable images",
    );

    expect(mockFetch.mock.calls[0]?.[0].pathname).toBe(
      "/openaccess/api/v1.0/search",
    );
  });

  it("falls back to default dimensions when metadata lacks width or height", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
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
        )
        .mockResolvedValueOnce(
          new Response("image", { headers: { "content-type": "image/jpeg" } }),
        ),
    );

    const { asset } = await smithsonianSource.fetchRandom();
    expect(asset.width).toBeGreaterThan(0);
    expect(asset.height).toBeGreaterThan(0);
  });

  it("resolves relative and http record links to canonical https URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
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
        )
        .mockResolvedValueOnce(
          new Response("image", { headers: { "content-type": "image/jpeg" } }),
        ),
    );

    const { asset } = await smithsonianSource.fetchRandom();
    expect(asset.attribution?.sourceUrl).toBe(
      "https://www.si.edu/object/saam_1969.47.61",
    );
  });

  it("queues remaining rows and reuses them on subsequent rotations without API calls", async () => {
    const makeRow = (id: string, imageUrl: string) => ({
      id,
      title: `Photo ${id}`,
      content: {
        descriptiveNonRepeating: {
          record_link: `https://airandspace.si.edu/object/${id}`,
          online_media: {
            media: [
              {
                content: imageUrl,
                resources: [{ width: 1920, height: 1080 }],
                type: "Images",
                usage: { access: "CC0" },
              },
            ],
          },
        },
      },
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              rows: [
                makeRow("item-1", "https://images.example.com/1.jpg"),
                makeRow("item-2", "https://images.example.com/2.jpg"),
                makeRow("item-3", "https://images.example.com/3.jpg"),
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response("image-1", {
          headers: { "content-type": "image/jpeg" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("image-2", {
          headers: { "content-type": "image/jpeg" },
        }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const storageGet = vi.spyOn(chrome.storage.local, "get");
    const storageSet = vi.spyOn(chrome.storage.local, "set");

    const first = await smithsonianSource.fetchRandom();
    expect(first.asset.sourceAssetId).toBe("item-1");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const storedBatch = local["sourceQueue:smithsonian"];
    storageGet.mockClear();
    storageSet.mockClear();

    const second = await smithsonianSource.fetchRandom();
    expect(second.asset.sourceAssetId).toBe("item-2");
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[2]?.[0]).toEqual(
      new URL("https://images.example.com/2.jpg"),
    );
    expect(storageGet).toHaveBeenCalledExactlyOnceWith([
      "sourceQueue:smithsonian",
      "sourceQueueCursor:smithsonian",
    ]);
    expect(storageSet).toHaveBeenCalledExactlyOnceWith({
      "sourceQueueCursor:smithsonian": 2,
    });
    expect(local["sourceQueue:smithsonian"]).toBe(storedBatch);
    expect(JSON.stringify(storageSet.mock.calls[0]?.[0]).length).toBeLessThan(
      45,
    );
  });

  it("skips broken images and refills after the cursor reaches the end", async () => {
    local["sourceQueue:smithsonian"] = {
      category: "art_design",
      items: ["broken", "working"].map((id) => ({
        sourceId: "smithsonian",
        sourceAssetId: id,
        width: 1600,
        height: 900,
        createdAt: 0,
        sourcePayload: { imageUrl: `https://images.example.com/${id}.jpg` },
      })),
    };
    local["sourceQueueCursor:smithsonian"] = 0;
    const mockFetch = vi
      .fn()
      .mockImplementationOnce(async () => {
        expect(local["sourceQueueCursor:smithsonian"]).toBe(1);
        throw new Error("Broken image");
      })
      .mockResolvedValueOnce(
        new Response("image", { headers: { "content-type": "image/jpeg" } }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              rows: [
                {
                  id: "refilled",
                  content: {
                    descriptiveNonRepeating: {
                      online_media: {
                        media: [
                          {
                            type: "Images",
                            usage: { access: "CC0" },
                            content: "https://images.example.com/refilled.jpg",
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
        new Response("image", { headers: { "content-type": "image/jpeg" } }),
      );
    vi.stubGlobal("fetch", mockFetch);

    await expect(smithsonianSource.fetchRandom()).rejects.toThrow(
      "Broken image",
    );
    const working = await smithsonianSource.fetchRandom();
    expect(working.asset.sourceAssetId).toBe("working");
    expect(working.asset.createdAt).toBeGreaterThan(0);
    expect(local["sourceQueueCursor:smithsonian"]).toBe(2);

    const storageSet = vi.spyOn(chrome.storage.local, "set");
    const refilled = await smithsonianSource.fetchRandom();

    expect(refilled.asset.sourceAssetId).toBe("refilled");
    expect(mockFetch.mock.calls[2]?.[0].hostname).toBe("api.si.edu");
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(storageSet).toHaveBeenCalledExactlyOnceWith({
      "sourceQueue:smithsonian": {
        category: "art_design",
        items: [expect.objectContaining({ sourceAssetId: "refilled" })],
      },
      "sourceQueueCursor:smithsonian": 1,
    });
  });

  it.each(["get", "set"] as const)(
    "propagates queue storage %s failures",
    async (operation) => {
      local["sourceQueue:smithsonian"] = {
        category: "art_design",
        items: [
          { sourcePayload: { imageUrl: "https://images.example.com/1.jpg" } },
        ],
      };
      vi.spyOn(chrome.storage.local, operation).mockRejectedValueOnce(
        new Error("Storage failed"),
      );
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      await expect(smithsonianSource.fetchRandom()).rejects.toThrow(
        "Storage failed",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it("invalidates the queue when the category setting changes", async () => {
    const makeRow = (id: string, imageUrl: string) => ({
      id,
      title: `Photo ${id}`,
      content: {
        descriptiveNonRepeating: {
          online_media: {
            media: [
              {
                content: imageUrl,
                type: "Images",
                usage: { access: "CC0" },
              },
            ],
          },
        },
      },
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              rows: [
                makeRow("art-1", "https://images.example.com/art-1.jpg"),
                makeRow("art-2", "https://images.example.com/art-2.jpg"),
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response("art-image", {
          headers: { "content-type": "image/jpeg" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              rows: [
                makeRow(
                  "science-1",
                  "https://images.example.com/science-1.jpg",
                ),
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response("science-image", {
          headers: { "content-type": "image/jpeg" },
        }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const first = await smithsonianSource.fetchRandom();
    expect(first.asset.sourceAssetId).toBe("art-1");

    await setSmithsonianCategory("science_technology");

    const second = await smithsonianSource.fetchRandom();
    expect(second.asset.sourceAssetId).toBe("science-1");
    expect(mockFetch.mock.calls[2]?.[0].toString()).toContain(
      "/category/science_technology/search",
    );
  });
});
