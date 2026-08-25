import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRandomPhotoUrl,
  imageUrlForResolution,
  unsplashSource,
} from "../src/ts/sources/unsplash";

const raw = "https://images.unsplash.com/photo-example?ixid=example";

beforeEach(() => {
  vi.stubGlobal("__UNSPLASH_ACCESS_KEY__", "bundled-key");
  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get: (_keys: unknown, callback: (value: unknown) => void) =>
          callback({}),
      },
      sync: {
        get: (_keys: unknown, callback: (value: unknown) => void) =>
          callback({}),
      },
    },
  });
});

describe("Unsplash random photo URL filters", () => {
  it("defaults to the Stellar Photos collection with standard content filter", () => {
    const url = buildRandomPhotoUrl({});
    expect(url.searchParams.get("collections")).toBe("998309");
    expect(url.searchParams.get("content_filter")).toBe("low");
    expect(url.searchParams.get("query")).toBeNull();
    expect(url.searchParams.get("topics")).toBeNull();
    expect(url.searchParams.get("username")).toBeNull();
    expect(url.searchParams.get("orientation")).toBeNull();
  });

  it("combines topics, collections, and username when no query is specified", () => {
    const url = buildRandomPhotoUrl({
      collections: "12345, 67890",
      topics: "nature, wallpapers",
      username: "nasa",
      orientation: "landscape",
      contentFilter: "high",
    });

    expect(url.searchParams.get("collections")).toBe("12345,67890");
    expect(url.searchParams.get("topics")).toBe("nature,wallpapers");
    expect(url.searchParams.get("username")).toBe("nasa");
    expect(url.searchParams.get("orientation")).toBe("landscape");
    expect(url.searchParams.get("content_filter")).toBe("high");
    expect(url.searchParams.get("query")).toBeNull();
  });

  it("enforces Unsplash restriction by omitting collections and topics when query is set", () => {
    const url = buildRandomPhotoUrl({
      query: "galaxy stars",
      collections: "12345",
      topics: "space",
      username: "nasa",
      orientation: "portrait",
    });

    expect(url.searchParams.get("query")).toBe("galaxy stars");
    expect(url.searchParams.get("username")).toBe("nasa");
    expect(url.searchParams.get("orientation")).toBe("portrait");
    expect(url.searchParams.get("collections")).toBeNull();
    expect(url.searchParams.get("topics")).toBeNull();
  });

  it("omits default collection when user or topics are explicitly configured without collections", () => {
    const urlUser = buildRandomPhotoUrl({ username: "nasa", collections: "" });
    expect(urlUser.searchParams.get("username")).toBe("nasa");
    expect(urlUser.searchParams.get("collections")).toBeNull();

    const urlTopic = buildRandomPhotoUrl({ topics: "nature", collections: "" });
    expect(urlTopic.searchParams.get("topics")).toBe("nature");
    expect(urlTopic.searchParams.get("collections")).toBeNull();
  });
});

describe("Unsplash image resolution", () => {
  it("requests a 2000px standard image", () => {
    const url = new URL(imageUrlForResolution(raw, "standard"));
    expect(url.searchParams.get("w")).toBe("2000");
    expect(url.searchParams.get("fit")).toBe("max");
  });

  it("requests a 4000px high image", () => {
    expect(
      new URL(imageUrlForResolution(raw, "high")).searchParams.get("w"),
    ).toBe("4000");
  });

  it("leaves the raw image unconstrained for max resolution", () => {
    expect(imageUrlForResolution(raw, "max")).toBe(raw);
  });

  it("owns its metadata payload, image download, and tracking lifecycle", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/photos/random",
      JSON.stringify({
        id: "photo-1",
        width: 1600,
        height: 900,
        color: "#123456",
        description: null,
        alt_description: "A mountain",
        urls: { raw },
        links: {
          html: "https://unsplash.com/photos/photo-1",
          download_location: "https://api.unsplash.com/photos/photo-1/download",
        },
        user: { name: "Ada", links: { html: "https://unsplash.com/@ada" } },
      }),
      { "content-type": "application/json" },
    );
    const imageResponse = responseAt(
      "https://images.unsplash.com/photo-example?w=2000",
      new Uint8Array([1, 2, 3]),
      { "content-type": "image/jpeg" },
    );
    const trackingResponse = responseAt(
      "https://api.unsplash.com/photos/photo-1/download",
      "{}",
      { "content-type": "application/json" },
    );
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(apiResponse)
      .mockResolvedValueOnce(imageResponse)
      .mockResolvedValueOnce(trackingResponse);

    vi.stubGlobal("fetch", fetchMock);

    const asset = await unsplashSource.getRandomAsset();
    const image = await unsplashSource.downloadAsset(asset);

    await unsplashSource.didDownload?.({ ...asset, cacheKey: "cache-key" });

    expect(asset).toMatchObject({
      sourceId: "unsplash",
      sourceAssetId: "photo-1",
      description: "A mountain",
      attribution: { name: "Ada" },
      payloadVersion: 1,
    });
    expect(await image.arrayBuffer()).toHaveProperty("byteLength", 3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("determines whether to rotate according to photo frequency setting and photo age", async () => {
    const asset = {
      sourceId: "unsplash",
      sourceAssetId: "photo-1",
      cacheKey: "cache-1",
      width: 1920,
      height: 1080,
      color: null,
      description: null,
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {},
      createdAt: Date.now() - 20 * 60 * 1000,
    };

    expect(
      await unsplashSource.shouldRotate?.({ ...asset, sourceId: "other" }),
    ).toBe(true);
    expect(await unsplashSource.shouldRotate?.(asset)).toBe(true);

    vi.stubGlobal("chrome", {
      runtime: { lastError: undefined },
      storage: {
        local: {
          get: (_keys: unknown, callback: (value: unknown) => void) =>
            callback({}),
        },
        sync: {
          get: (_keys: unknown, cb: (val: unknown) => void) =>
            cb({
              "sourceSettings:unsplash": {
                version: 1,
                imageQuality: "standard",
                photoFrequency: "every15minutes",
              },
            }),
        },
      },
    });

    expect(await unsplashSource.shouldRotate?.(asset)).toBe(true);
    expect(
      await unsplashSource.shouldRotate?.({
        ...asset,
        createdAt: Date.now() - 10 * 60 * 1000,
      }),
    ).toBe(false);

    vi.stubGlobal("chrome", {
      runtime: { lastError: undefined },
      storage: {
        local: {
          get: (_keys: unknown, callback: (value: unknown) => void) =>
            callback({}),
        },
        sync: {
          get: (_keys: unknown, cb: (val: unknown) => void) =>
            cb({
              "sourceSettings:unsplash": {
                version: 1,
                imageQuality: "standard",
                photoFrequency: "everyhour",
              },
            }),
        },
      },
    });

    expect(await unsplashSource.shouldRotate?.(asset)).toBe(false);
    expect(
      await unsplashSource.shouldRotate?.({
        ...asset,
        createdAt: Date.now() - 70 * 60 * 1000,
      }),
    ).toBe(true);
  });
});

function responseAt(
  url: string,
  body: BodyInit,
  headers: HeadersInit,
): Response {
  const response = new Response(body, { headers });

  Object.defineProperty(response, "url", { value: url });

  return response;
}
