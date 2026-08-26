import { describe, expect, it } from "vitest";

import {
  assetCacheKey,
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

  it.each(["", "a".repeat(129), "bad\u0000id"])(
    "rejects invalid source and asset IDs %j",
    (id) => {
      expect(() => assetCacheKey(id, "asset")).toThrow("Invalid source ID");
      expect(() => assetCacheKey("source", id)).toThrow("Invalid asset ID");
    },
  );

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
});
