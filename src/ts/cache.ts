const CACHE_PREFIX = "stellar-photos-images-v";
export const ACTIVE_CACHE_NAME = `${CACHE_PREFIX}1`;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CACHE_ORIGIN = "https://cache.stellar-photos.invalid";
// biome-ignore lint/suspicious/noControlCharactersInRegex: IDs must reject ASCII control characters.
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function assetCacheKey(sourceId: string, sourceAssetId: string): string {
  const source = encodeURIComponent(validateIdentifier(sourceId, "source"));
  const asset = encodeURIComponent(validateIdentifier(sourceAssetId, "asset"));

  return `${CACHE_ORIGIN}/asset/${source}/${asset}`;
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

export async function readBoundedImage(response: Response): Promise<Response> {
  if (!response.ok)
    throw new Error(`Image request failed (${response.status})`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/"))
    throw new Error("Remote URL did not return an image");

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

function validateIdentifier(id: string, label: string): string {
  if (
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 128 ||
    CONTROL_CHARACTER.test(id)
  ) {
    throw new Error(`Invalid ${label} ID`);
  }

  return id;
}
