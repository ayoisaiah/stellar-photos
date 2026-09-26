// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { HISTORY_LIMIT } from "./assets";
import {
  assetCacheKey,
  createThumbnail,
  deleteCachedImage,
  deleteCachedThumbnail,
  putCachedImage,
  putCachedThumbnail,
} from "./cache";
import { getPhotoFrequency } from "./settings";
import { getActiveImageSources, getImageSource } from "./sources";
import { shouldRotateAtFrequency } from "./sources/photo-frequency";
import { setSourceError } from "./sources/source-health";
import { readHistory, readPinnedAsset, writeHistory } from "./storage";

import type { BackgroundAsset } from "./assets";
import type { ImageSource } from "./sources";

const LOCK_NAME = "stellar_actions_lock";

let queueTail: Promise<void> = Promise.resolve();

function nextImage(): Promise<void> {
  return enqueue(async () => {
    const pinned = await readPinnedAsset();
    if (pinned) return;

    const { history } = await readHistory();
    const current = history[0];
    const frequency = await getPhotoFrequency();

    if (current && !shouldRotateAtFrequency(current, frequency)) return;

    const sources = await getActiveImageSources();
    let lastError: unknown;

    for (const source of shuffleSources(sources)) {
      let retrieved = false;

      try {
        const candidate = await source.getRandomAsset();
        if (candidate.sourceId !== source.id) {
          throw new Error("Image source returned an asset for another source");
        }

        const image = await source.downloadAsset(candidate);
        retrieved = true;
        await setSourceError(source.id, "").catch(console.error);

        const asset: BackgroundAsset = {
          ...candidate,
          cacheKey: assetCacheKey(candidate.sourceId, candidate.sourceAssetId),
        };

        await cacheAndRecordImage(asset, image);

        return;
      } catch (error) {
        console.error(error);
        lastError = error;

        if (!retrieved) {
          await setSourceError(
            source.id,
            error instanceof Error ? error.message : String(error),
          ).catch(console.error);
        }
      }
    }

    throw (
      lastError ?? new Error("Failed to fetch image from any active source")
    );
  });
}

async function trackDownload(asset: BackgroundAsset): Promise<void> {
  const source = getImageSource(asset.sourceId);

  if (!source || !source.supportsDownload) return;

  try {
    await source.didDownload?.(asset);
  } catch {
    // Ignore tracking errors
  }
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = async () => {
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return navigator.locks.request(LOCK_NAME, operation);
    }
    return operation();
  };

  const result = queueTail.then(run, run);

  queueTail = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

async function cacheAndRecordImage(
  asset: BackgroundAsset,
  image: Response,
): Promise<void> {
  const imageForThumb = image.clone();
  await putCachedImage(asset.cacheKey, image);

  try {
    const blob = await imageForThumb.blob();
    const thumbnailBlob = await createThumbnail(blob);
    if (thumbnailBlob) {
      await putCachedThumbnail(
        asset.cacheKey,
        new Response(thumbnailBlob, {
          headers: {
            "content-type": "image/webp",
            "content-length": String(thumbnailBlob.size),
          },
        }),
      );
    }
  } catch {
    // Non-fatal thumbnail generation failure
  }

  const { history } = await readHistory();
  const nextHistory = [asset, ...history].slice(0, HISTORY_LIMIT);
  const evicted = history.length >= HISTORY_LIMIT ? history.at(-1) : null;
  await writeHistory({ history: nextHistory });

  if (
    evicted &&
    !nextHistory.some((item) => item.cacheKey === evicted.cacheKey)
  ) {
    try {
      await deleteCachedImage(evicted.cacheKey);
    } catch {
      // Ignore cache cleanup error
    }
    try {
      await deleteCachedThumbnail(evicted.cacheKey);
    } catch {
      // Ignore thumbnail cleanup error
    }
  }
}

function shuffleSources(sources: readonly ImageSource[]): ImageSource[] {
  const result = [...sources];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }

  return result;
}

export { nextImage, trackDownload };
