import { readCachedImage } from "./cache";

async function readImage(
  cacheKey: string,
  thumbnail = false,
): Promise<Response | undefined> {
  const cached = thumbnail
    ? await readCachedImage(cacheKey, "thumbnail")
    : await readCachedImage(cacheKey);

  if (cached) return cached;

  return thumbnail ? readCachedImage(cacheKey) : undefined;
}

export { readImage };
