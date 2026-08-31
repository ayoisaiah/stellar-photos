import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTimeout } from "../src/ts/requests";
import {
  buildRandomPhotoUrl,
  clearVerificationCache,
  fullResolutionImageUrl,
  getUnsplashPhotoInfo,
  imageUrlForResolution,
  unsplashSource,
  verifyUnsplashCollection,
  verifyUnsplashTopic,
} from "../src/ts/sources/unsplash";

const raw = "https://images.unsplash.com/photo-example?ixid=example";

beforeEach(() => {
  vi.stubGlobal("__UNSPLASH_ACCESS_KEY__", "bundled-key");
  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get: (_keys: unknown, callback?: (value: unknown) => void) => {
          if (callback) callback({});
          return Promise.resolve({});
        },
      },
      sync: {
        get: (_keys: unknown, callback?: (value: unknown) => void) => {
          if (callback) callback({});
          return Promise.resolve({});
        },
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

  it("extracts slugs and IDs when full Unsplash URLs are passed as topics or collections", () => {
    const url = buildRandomPhotoUrl({
      topics: "https://unsplash.com/t/wallpapers, nature",
      collections: "https://unsplash.com/collections/12345/featured, 67890",
    });
    expect(url.searchParams.get("topics")).toBe("wallpapers,nature");
    expect(url.searchParams.get("collections")).toBe("12345,67890");
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

  it("strips sizing constraints from image URLs for full-resolution downloads", () => {
    const sized =
      "https://images.unsplash.com/photo-example?w=2000&fit=max&h=1000";
    expect(fullResolutionImageUrl(sized)).toBe(
      "https://images.unsplash.com/photo-example",
    );
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
        likes: 42,
        downloads: 100,
        location: { name: "Mount Rainier", city: "Seattle", country: "USA" },
        exif: {
          make: "Canon",
          model: "EOS R5",
          exposure_time: "1/250",
          aperture: "2.8",
          focal_length: 50,
          iso: 100,
        },
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
    const fullImageResponse = responseAt(raw, new Uint8Array([1, 2, 3, 4, 5]), {
      "content-type": "image/jpeg",
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(apiResponse)
      .mockResolvedValueOnce(imageResponse)
      .mockResolvedValueOnce(fullImageResponse)
      .mockResolvedValueOnce(trackingResponse);

    vi.stubGlobal("fetch", fetchMock);

    const asset = await unsplashSource.getRandomAsset();
    const image = await unsplashSource.downloadAsset(asset);
    const fullImage = await unsplashSource.downloadFullAsset?.({
      ...asset,
      cacheKey: "cache-key",
    });

    await unsplashSource.didDownload?.({ ...asset, cacheKey: "cache-key" });

    expect(asset).toMatchObject({
      sourceId: "unsplash",
      sourceAssetId: "photo-1",
      description: "A mountain",
      attribution: { name: "Ada" },
      payloadVersion: 1,
    });
    expect(getUnsplashPhotoInfo({ ...asset, cacheKey: "cache-key" })).toEqual({
      user: {
        name: "Ada",
        username: null,
        profileImage: null,
        link: "https://unsplash.com/@ada",
      },
      location: { name: "Mount Rainier", city: "Seattle", country: "USA" },
      exif: {
        make: "Canon",
        model: "EOS R5",
        exposureTime: "1/250",
        aperture: "2.8",
        focalLength: "50",
        iso: 100,
      },
      views: null,
      description: "A mountain",
    });
    expect(await image.arrayBuffer()).toHaveProperty("byteLength", 3);
    expect(await fullImage?.arrayBuffer()).toHaveProperty("byteLength", 5);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not send credentials to a foreign tracking origin", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const asset = {
      sourceId: "unsplash",
      sourceAssetId: "photo-1",
      cacheKey: "cache-1",
      width: 1600,
      height: 900,
      color: null,
      description: null,
      attribution: null,
      payloadVersion: 1,
      sourcePayload: {
        downloadLocation: "https://example.com/collect",
      },
      createdAt: Date.now(),
    };

    await expect(unsplashSource.didDownload?.(asset)).rejects.toThrow(
      "Refusing to send Unsplash credentials to another origin",
    );
    expect(fetchMock).not.toHaveBeenCalled();
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
          get: (_keys: unknown, callback?: (value: unknown) => void) => {
            if (callback) callback({});
            return Promise.resolve({});
          },
        },
        sync: {
          get: (_keys: unknown, cb?: (val: unknown) => void) => {
            const res = {
              "sourceSettings:unsplash": {
                version: 1,
                imageQuality: "standard",
                photoFrequency: "every15minutes",
              },
            };
            if (cb) cb(res);
            return Promise.resolve(res);
          },
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
          get: (_keys: unknown, callback?: (value: unknown) => void) => {
            if (callback) callback({});
            return Promise.resolve({});
          },
        },
        sync: {
          get: (_keys: unknown, cb?: (val: unknown) => void) => {
            const res = {
              "sourceSettings:unsplash": {
                version: 1,
                imageQuality: "standard",
                photoFrequency: "everyhour",
              },
            };
            if (cb) cb(res);
            return Promise.resolve(res);
          },
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

  it("times out fetch requests when deadline exceeds timeout", async () => {
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchWithTimeout(
      "https://images.unsplash.com/test",
      undefined,
      10,
    );

    await expect(promise).rejects.toThrow("aborted");
  });

  it("respects caller-provided abort signals", async () => {
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("caller-aborted"));
        });
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const controller = new AbortController();
    const promise = fetchWithTimeout("https://images.unsplash.com/test", {
      signal: controller.signal,
    });
    controller.abort();

    await expect(promise).rejects.toThrow("caller-aborted");
  });
});

describe("Unsplash collection and topic verification", () => {
  beforeEach(() => {
    clearVerificationCache();
  });

  it("verifies default collection without network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyUnsplashCollection("998309");

    expect(result).toEqual({ valid: true, normalized: "998309" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies valid collection and caches the result", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/collections/12345",
      JSON.stringify({ id: "12345", total_photos: 50 }),
      { "content-type": "application/json" },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const firstResult = await verifyUnsplashCollection("12345");
    expect(firstResult).toEqual({ valid: true, normalized: "12345" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const secondResult = await verifyUnsplashCollection("12345");
    expect(secondResult).toEqual({ valid: true, normalized: "12345" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("extracts collection ID from full URL and verifies it", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/collections/45678",
      JSON.stringify({ id: "45678", total_photos: 12 }),
      { "content-type": "application/json" },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyUnsplashCollection(
      "https://unsplash.com/collections/45678/featured-shots",
    );

    expect(result).toEqual({ valid: true, normalized: "45678" });
  });

  it("fails when collection does not exist (404)", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/collections/00000",
      "{}",
      {
        status: 404,
      },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyUnsplashCollection("00000");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("was not found");
  });

  it("fails when collection has 0 photos", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/collections/empty-coll",
      JSON.stringify({ id: "empty-coll", total_photos: 0 }),
      { "content-type": "application/json" },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyUnsplashCollection("empty-coll");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("contains no photos");
  });

  it("verifies valid topic and resolves its topic ID", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/topics/wallpapers",
      JSON.stringify({
        id: "bo8jQKTaE0Y",
        slug: "wallpapers",
        total_photos: 100,
      }),
      { "content-type": "application/json" },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const firstResult = await verifyUnsplashTopic("wallpapers");
    expect(firstResult).toEqual({ valid: true, normalized: "bo8jQKTaE0Y" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const secondResult = await verifyUnsplashTopic("wallpapers");
    expect(secondResult).toEqual({ valid: true, normalized: "bo8jQKTaE0Y" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("extracts topic slug from full URL and resolves its topic ID", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/topics/nature",
      JSON.stringify({ id: "6sMVjTLSkeQ", slug: "nature", total_photos: 200 }),
      { "content-type": "application/json" },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyUnsplashTopic("https://unsplash.com/t/nature");

    expect(result).toEqual({ valid: true, normalized: "6sMVjTLSkeQ" });
  });

  it("fails when topic does not exist (404)", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/topics/nonexistent",
      "{}",
      {
        status: 404,
      },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyUnsplashTopic("nonexistent");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("was not found");
  });

  it("fails when topic contains 0 photos", async () => {
    const apiResponse = responseAt(
      "https://api.unsplash.com/topics/empty-topic",
      JSON.stringify({ id: "t3", slug: "empty-topic", total_photos: 0 }),
      { "content-type": "application/json" },
    );
    const fetchMock = vi.fn().mockResolvedValue(apiResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyUnsplashTopic("empty-topic");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("contains no photos");
  });

  it("rejects empty or whitespace-only identifiers", async () => {
    expect((await verifyUnsplashCollection("")).valid).toBe(false);
    expect((await verifyUnsplashCollection("   ")).valid).toBe(false);
    expect((await verifyUnsplashTopic("")).valid).toBe(false);
    expect((await verifyUnsplashTopic("   ")).valid).toBe(false);
  });
});

function responseAt(
  url: string,
  body: BodyInit,
  init?: ResponseInit | HeadersInit,
): Response {
  const options =
    init &&
    typeof init === "object" &&
    !("status" in init) &&
    !("headers" in init)
      ? { headers: init as HeadersInit }
      : (init as ResponseInit);
  const response = new Response(body, options);

  Object.defineProperty(response, "url", { value: url });

  return response;
}
