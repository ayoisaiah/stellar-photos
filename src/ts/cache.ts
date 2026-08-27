const CACHE_PREFIX = "stellar-photos-images-v";
const ACTIVE_CACHE_NAME = `${CACHE_PREFIX}1`;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CACHE_ORIGIN = "https://cache.stellar-photos.invalid";
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 270;
const THUMBNAIL_QUALITY = 0.85;
// biome-ignore lint/suspicious/noControlCharactersInRegex: IDs must reject ASCII control characters.
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function assetCacheKey(sourceId: string, sourceAssetId: string): string {
  const source = encodeURIComponent(validateIdentifier(sourceId, "source"));
  const asset = encodeURIComponent(validateIdentifier(sourceAssetId, "asset"));

  return `${CACHE_ORIGIN}/asset/${source}/${asset}`;
}

function assetThumbnailCacheKey(cacheKey: string): string {
  return cacheKey.replace("/asset/", "/thumbnail/");
}

async function activeCache(): Promise<Cache> {
  return caches.open(ACTIVE_CACHE_NAME);
}

async function readCachedImage(
  cacheKey: string,
): Promise<Response | undefined> {
  return (await activeCache()).match(cacheKey);
}

async function putCachedImage(
  cacheKey: string,
  response: Response,
): Promise<void> {
  await (await activeCache()).put(cacheKey, response);
}

async function deleteCachedImage(cacheKey: string): Promise<boolean> {
  return (await activeCache()).delete(cacheKey);
}

async function readCachedThumbnail(
  cacheKey: string,
): Promise<Response | undefined> {
  const thumbKey = assetThumbnailCacheKey(cacheKey);

  return (await activeCache()).match(thumbKey);
}

async function putCachedThumbnail(
  cacheKey: string,
  response: Response,
): Promise<void> {
  const thumbKey = assetThumbnailCacheKey(cacheKey);

  await (await activeCache()).put(thumbKey, response);
}

async function deleteCachedThumbnail(cacheKey: string): Promise<boolean> {
  const thumbKey = assetThumbnailCacheKey(cacheKey);

  return (await activeCache()).delete(thumbKey);
}

async function createThumbnail(blob: Blob): Promise<Blob | null> {
  try {
    if (
      typeof createImageBitmap !== "function" ||
      typeof OffscreenCanvas !== "function"
    ) {
      return null;
    }

    const initialBitmap = await createImageBitmap(blob);
    const origWidth = initialBitmap.width;
    const origHeight = initialBitmap.height;
    initialBitmap.close();

    if (origWidth <= 0 || origHeight <= 0) {
      return null;
    }

    const scale = Math.max(
      THUMBNAIL_WIDTH / origWidth,
      THUMBNAIL_HEIGHT / origHeight,
    );
    const resizeWidth = Math.max(1, Math.round(origWidth * scale));
    const resizeHeight = Math.max(1, Math.round(origHeight * scale));

    const bitmap = await createImageBitmap(blob, {
      resizeWidth,
      resizeHeight,
      resizeQuality: "high",
    });

    const canvas = new OffscreenCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }

    const offsetX = Math.round((THUMBNAIL_WIDTH - bitmap.width) / 2);
    const offsetY = Math.round((THUMBNAIL_HEIGHT - bitmap.height) / 2);
    ctx.drawImage(bitmap, offsetX, offsetY, bitmap.width, bitmap.height);
    bitmap.close();

    return await canvas.convertToBlob({
      type: "image/webp",
      quality: THUMBNAIL_QUALITY,
    });
  } catch {
    return null;
  }
}

async function readBoundedImage(response: Response): Promise<Response> {
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

export {
  ACTIVE_CACHE_NAME,
  assetCacheKey,
  assetThumbnailCacheKey,
  createThumbnail,
  deleteCachedImage,
  deleteCachedThumbnail,
  MAX_IMAGE_BYTES,
  putCachedImage,
  putCachedThumbnail,
  readBoundedImage,
  readCachedImage,
  readCachedThumbnail,
};
