import { readCachedImage } from "./cache";
import type { WorkerResult } from "./service-worker";

async function readImage(
  cacheKey: string,
  thumbnail = false,
): Promise<Response | undefined> {
  const cached =
    (thumbnail ? await readCachedImage(cacheKey, "thumbnail") : undefined) ??
    (await readCachedImage(cacheKey));

  if (cached) return cached;
  if (location.protocol !== "moz-extension:") return undefined;

  try {
    const result = (await chrome.runtime.sendMessage({
      command: "read-image",
      cacheKey,
      thumbnail,
    })) as WorkerResult;

    return result?.ok && result.image ? new Response(result.image) : undefined;
  } catch {
    return undefined;
  }
}

export { readImage };
