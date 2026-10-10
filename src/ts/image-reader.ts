import { type CacheKind, readCachedImage } from "./cache";
import type { WorkerResult } from "./service-worker";

async function readImage(
  cacheKey: string,
  kind: CacheKind = "image",
): Promise<Response | undefined> {
  const cached = await readCachedImage(cacheKey, kind);

  if (cached || location.protocol !== "moz-extension:") return cached;

  try {
    const result = (await chrome.runtime.sendMessage({
      command: "read-image",
      cacheKey,
      kind,
    })) as WorkerResult;

    return result?.ok && result.image ? new Response(result.image) : undefined;
  } catch {
    return undefined;
  }
}

export { readImage };
