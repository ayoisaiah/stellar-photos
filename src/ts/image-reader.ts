import { readCachedImage, readCachedThumbnail } from "./cache";
import type { WorkerResult } from "./service-worker";

async function readImage(
  cacheKey: string,
  thumbnail = false,
): Promise<Response | undefined> {
  const cached = thumbnail
    ? await readCachedThumbnail(cacheKey)
    : await readCachedImage(cacheKey);
  if (cached) return cached;

  const result: WorkerResult = await chrome.runtime.sendMessage({
    command: "read-image",
    cacheKey,
    thumbnail,
  });
  if (!result?.ok) {
    throw new Error(
      result && !result.ok ? result.error.message : "No image response",
    );
  }

  if (result.image) return fetch(result.image);

  return thumbnail ? readCachedImage(cacheKey) : undefined;
}

export { readImage };
