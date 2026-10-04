import { putCachedImage, readCachedImage } from "./cache";
import type { WorkerResult } from "./service-worker";

async function readImage(
  cacheKey: string,
  thumbnail = false,
): Promise<Response | undefined> {
  const cached = thumbnail
    ? await readCachedImage(cacheKey, "thumbnail")
    : await readCachedImage(cacheKey);

  if (cached) return cached;

  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    try {
      const result = (await chrome.runtime.sendMessage({
        command: "read-image",
        cacheKey,
        thumbnail,
      })) as WorkerResult | undefined;

      if (result?.ok && result.image) {
        const response = await fetch(result.image);

        void putCachedImage(
          cacheKey,
          response.clone(),
          thumbnail ? "thumbnail" : "image",
        ).catch(() => undefined);

        return response;
      }
    } catch {
      // Background message unavailable or failed
    }
  }

  return thumbnail ? readCachedImage(cacheKey) : undefined;
}

export { readImage };
