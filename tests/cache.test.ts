import { describe, expect, it } from "vitest";

import {
  assetCacheKey,
  assetThumbnailCacheKey,
  createThumbnail,
  MAX_IMAGE_BYTES,
  readBoundedImage,
} from "../src/ts/cache";

describe("image cache contract", () => {
  it("maps unusual valid IDs to distinct stable keys", () => {
    expect(assetCacheKey("source", "a/b")).not.toBe(
      assetCacheKey("source", "a%2Fb"),
    );
    expect(assetCacheKey("source", "a/b")).toBe(
      "https://cache.stellar-photos.invalid/asset/source/a%2Fb",
    );
  });

  it("derives thumbnail cache key from canonical asset cache key", () => {
    const assetKey = assetCacheKey("unsplash", "photo-1");
    expect(assetThumbnailCacheKey(assetKey)).toBe(
      "https://cache.stellar-photos.invalid/thumbnail/unsplash/photo-1",
    );
  });

  it.each(["", "a".repeat(129), "bad\u0000id"])(
    "rejects invalid source and asset IDs %j",
    (id) => {
      expect(() => assetCacheKey(id, "asset")).toThrow("Invalid source ID");
      expect(() => assetCacheKey("source", id)).toThrow("Invalid asset ID");
    },
  );

  it("handles non-fatal createThumbnail when canvas/bitmap APIs are unavailable in node", async () => {
    const blob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    const result = await createThumbnail(blob);
    expect(result).toBeNull();
  });

  it("rejects oversized and non-image responses", async () => {
    await expect(
      readBoundedImage(
        new Response("text", { headers: { "content-type": "text/plain" } }),
      ),
    ).rejects.toThrow("did not return an image");
    const response = new Response(new Uint8Array(1), {
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(MAX_IMAGE_BYTES + 1),
      },
    });
    await expect(readBoundedImage(response)).rejects.toThrow("20 MiB");
  });

  it("reads and buffers streaming image chunks into a valid response", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5, 6]));
        controller.close();
      },
    });

    const inputResponse = new Response(stream, {
      headers: { "content-type": "image/webp" },
    });

    const bounded = await readBoundedImage(inputResponse);
    expect(bounded.headers.get("content-type")).toBe("image/webp");

    const blob = await bounded.blob();
    expect(blob.size).toBe(6);
    expect(blob.type).toBe("image/webp");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4, 5, 6]),
    );
  });
});
