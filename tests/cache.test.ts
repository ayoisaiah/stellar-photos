import { describe, expect, it } from "vitest";

import { readBoundedImage } from "../src/ts/cache";

describe("readBoundedImage 20 MiB security cap", () => {
  it("rejects non-image content-type", async () => {
    const res = new Response("text", {
      headers: { "content-type": "text/plain" },
    });
    await expect(readBoundedImage(res)).rejects.toThrow(
      "did not return an image",
    );
  });

  it("rejects responses exceeding 20 MiB by declared content-length", async () => {
    const res = new Response(new Uint8Array(1), {
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(20 * 1024 * 1024 + 1),
      },
    });
    await expect(readBoundedImage(res)).rejects.toThrow("20 MiB");
  });

  it("rejects streaming response exceeding 20 MiB when content-length is missing", async () => {
    const chunk = new Uint8Array(5 * 1024 * 1024); // 5 MiB
    let count = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (count < 5) {
          // 5 * 5 = 25 MiB > 20 MiB
          count++;
          controller.enqueue(chunk);
        } else {
          controller.close();
        }
      },
    });

    const res = new Response(stream, {
      headers: { "content-type": "image/jpeg" }, // No content-length
    });

    await expect(readBoundedImage(res)).rejects.toThrow("20 MiB");
  });

  it("rejects streaming response exceeding 20 MiB when content-length lies (claims small size)", async () => {
    const chunk = new Uint8Array(5 * 1024 * 1024); // 5 MiB
    let count = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (count < 5) {
          // 5 * 5 = 25 MiB > 20 MiB
          count++;
          controller.enqueue(chunk);
        } else {
          controller.close();
        }
      },
    });

    const res = new Response(stream, {
      headers: {
        "content-type": "image/jpeg",
        "content-length": "1024", // Lies that body is only 1 KB
      },
    });

    await expect(readBoundedImage(res)).rejects.toThrow("20 MiB");
  });

  it("successfully reads and buffers valid image stream within 20 MiB", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5, 6]));
        controller.close();
      },
    });

    const res = new Response(stream, {
      headers: { "content-type": "image/jpeg" },
    });

    const blob = await readBoundedImage(res);
    expect(blob.size).toBe(6);
    expect(blob.type).toBe("image/jpeg");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4, 5, 6]),
    );
  });
});
