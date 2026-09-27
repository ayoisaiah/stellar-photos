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

type CacheKind = "image" | "thumbnail";

function resolveCacheKey(key: string, kind: CacheKind = "image"): string {
  return kind === "thumbnail" ? assetThumbnailCacheKey(key) : key;
}

async function readCachedImage(
  cacheKey: string,
  kind: CacheKind = "image",
): Promise<Response | undefined> {
  return (await activeCache()).match(resolveCacheKey(cacheKey, kind));
}

async function putCachedImage(
  cacheKey: string,
  response: Response,
  kind: CacheKind = "image",
): Promise<void> {
  await (await activeCache()).put(resolveCacheKey(cacheKey, kind), response);
}

async function deleteCachedImage(
  cacheKey: string,
  kind: CacheKind = "image",
): Promise<boolean> {
  return (await activeCache()).delete(resolveCacheKey(cacheKey, kind));
}

interface ThumbnailResult {
  blob: Blob;
  width: number;
  height: number;
}

async function createThumbnail(blob: Blob): Promise<ThumbnailResult | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const origWidth = bitmap.width;
    const origHeight = bitmap.height;

    if (origWidth <= 0 || origHeight <= 0) {
      bitmap.close();
      return null;
    }

    const scale = Math.max(
      THUMBNAIL_WIDTH / origWidth,
      THUMBNAIL_HEIGHT / origHeight,
    );
    const drawWidth = Math.max(1, Math.round(origWidth * scale));
    const drawHeight = Math.max(1, Math.round(origHeight * scale));

    const canvas = new OffscreenCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }

    const offsetX = Math.round((THUMBNAIL_WIDTH - drawWidth) / 2);
    const offsetY = Math.round((THUMBNAIL_HEIGHT - drawHeight) / 2);
    ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
    bitmap.close();

    const thumbBlob = await canvas.convertToBlob({
      type: "image/webp",
      quality: THUMBNAIL_QUALITY,
    });

    return {
      blob: thumbBlob,
      width: origWidth,
      height: origHeight,
    };
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
  const chunks: BlobPart[] = [];
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

  const body = new Blob(chunks, { type: contentType });

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

export type { CacheKind, ThumbnailResult };
export {
  ACTIVE_CACHE_NAME,
  assetCacheKey,
  assetThumbnailCacheKey,
  createThumbnail,
  deleteCachedImage,
  MAX_IMAGE_BYTES,
  putCachedImage,
  readBoundedImage,
  readCachedImage,
};
