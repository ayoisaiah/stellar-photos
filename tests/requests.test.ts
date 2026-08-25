import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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
