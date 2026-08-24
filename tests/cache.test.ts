import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  photoCacheKey,
  readBoundedImage,
} from "../src/js/cache";

describe("image cache contract", () => {
  it("maps unusual valid IDs to distinct stable keys", () => {
    expect(photoCacheKey("a/b")).not.toBe(photoCacheKey("a%2Fb"));
    expect(photoCacheKey("a/b")).toBe(
      "https://cache.stellar-photos.invalid/photo/a%2Fb",
    );
  });

  it.each(["", "a".repeat(129), "bad\u0000id"])(
    "rejects invalid ID %j",
    (id) => {
      expect(() => photoCacheKey(id)).toThrow("Invalid Unsplash photo ID");
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
