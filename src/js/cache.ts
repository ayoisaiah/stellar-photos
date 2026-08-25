const CACHE_PREFIX = "stellar-photos-images-v";
export const ACTIVE_CACHE_NAME = `${CACHE_PREFIX}1`;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CACHE_ORIGIN = "https://cache.stellar-photos.invalid";
// biome-ignore lint/suspicious/noControlCharactersInRegex: IDs must reject ASCII control characters.
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function validatePhotoId(id: string): string {
  if (
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 128 ||
    CONTROL_CHARACTER.test(id)
  ) {
    throw new Error("Invalid Unsplash photo ID");
  }
  return id;
}

export function photoCacheKey(id: string): string {
  return `${CACHE_ORIGIN}/photo/${encodeURIComponent(validatePhotoId(id))}`;
}

export async function activeCache(): Promise<Cache> {
  return caches.open(ACTIVE_CACHE_NAME);
}

export async function readCachedImage(
  cacheKey: string,
): Promise<Response | undefined> {
  return (await activeCache()).match(cacheKey);
}

export async function putCachedImage(
  cacheKey: string,
  response: Response,
): Promise<void> {
  await (await activeCache()).put(cacheKey, response);
}

export async function deleteCachedImage(cacheKey: string): Promise<boolean> {
  return (await activeCache()).delete(cacheKey);
}

export async function ownedCacheNames(): Promise<string[]> {
  return (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
}

export async function readBoundedImage(response: Response): Promise<Response> {
  if (!response.ok)
    throw new Error(`Image request failed (${response.status})`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/"))
    throw new Error("Unsplash URL did not return an image");

  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES)
    throw new Error("Image exceeds 20 MiB limit");

  if (!response.body) throw new Error("Image response has no body");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image exceeds 20 MiB limit");
    }

    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
