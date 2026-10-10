const CACHE_PREFIX = "stellar-photos-images-v";
const ACTIVE_CACHE_NAME = `${CACHE_PREFIX}1`;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CACHE_ORIGIN = "https://cache.stellar-photos.invalid";
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 270;
const THUMBNAIL_QUALITY = 0.85;
function assetCacheKey(sourceId: string, sourceAssetId: string): string {
  if (!sourceId || !sourceAssetId) {
    throw new Error("Invalid asset ID");
  }

  return `${CACHE_ORIGIN}/asset/${encodeURIComponent(sourceId)}/${encodeURIComponent(sourceAssetId)}`;
}

function assetThumbnailCacheKey(cacheKey: string): string {
  return cacheKey.replace("/asset/", "/thumbnail/");
}

let activeCachePromise: Promise<Cache> | null = null;

function activeCache(): Promise<Cache> {
  if (!activeCachePromise) {
    activeCachePromise = caches.open(ACTIVE_CACHE_NAME).catch((error) => {
      activeCachePromise = null;
      throw error;
    });
  }

  return activeCachePromise;
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

async function readBoundedImage(response: Response): Promise<Blob> {
  if (!response.ok) {
    throw new Error(`Image request failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error("Remote URL did not return an image");
  }

  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds 20 MiB limit");
  }

  if (!response.body) {
    throw new Error("Image response has no body");
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image exceeds 20 MiB limit");
    }

    chunks.push(value);
  }

  return new Blob(chunks, { type: contentType });
}

export type { CacheKind, ThumbnailResult };
export {
  ACTIVE_CACHE_NAME,
  assetCacheKey,
  createThumbnail,
  deleteCachedImage,
  putCachedImage,
  readBoundedImage,
  readCachedImage,
};
