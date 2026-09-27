import { error } from "node:console";
import type { BackgroundAsset } from "./assets";
import { HISTORY_LIMIT } from "./assets";
import {
  assetCacheKey,
  createThumbnail,
  deleteCachedImage,
  putCachedImage,
} from "./cache";
import { getPhotoFrequency } from "./settings";
import type { ImageSource } from "./sources";
import { getActiveImageSources, getImageSource } from "./sources";
import { shouldRotateAtFrequency } from "./sources/photo-frequency";
import { setSourceError } from "./sources/source-health";
import { readHistory, readPinnedAsset, writeHistory } from "./storage";
import { serialized } from "./store";

const LOCK_NAME = "stellar_actions_lock";

function nextImage(): Promise<void> {
  return serialized(LOCK_NAME, async () => {
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

  if (source && source.supportsDownload === false) return;
  await source?.didDownload?.(asset).catch((error) => {
    console.error(error);
  });
}

async function cacheAndRecordImage(
  asset: BackgroundAsset,
  image: Response,
): Promise<void> {
  const imageForThumb = image.clone();
  await putCachedImage(asset.cacheKey, image);

  let assetWithDimensions = asset;

  try {
    const blob = await imageForThumb.blob();
    const result = await createThumbnail(blob);

    if (result) {
      if ((!asset.width || !asset.height) && result.width && result.height) {
        assetWithDimensions = {
          ...asset,
          width: result.width,
          height: result.height,
        };
      }

      await putCachedImage(
        asset.cacheKey,
        new Response(result.blob, {
          headers: {
            "content-type": "image/webp",
            "content-length": String(result.blob.size),
          },
        }),
        "thumbnail",
      );
    }
  } catch (error) {
    console.error(error);
  }

  const { history } = await readHistory();
  const nextHistory = [assetWithDimensions, ...history].slice(0, HISTORY_LIMIT);
  const evicted = history.length >= HISTORY_LIMIT ? history.at(-1) : null;
  await writeHistory({ history: nextHistory });

  if (
    evicted &&
    !nextHistory.some((item) => item.cacheKey === evicted.cacheKey)
  ) {
    try {
      await deleteCachedImage(evicted.cacheKey);
      await deleteCachedImage(evicted.cacheKey, "thumbnail");
    } catch (error) {
      console.error(error);
    }
  }
}

function shuffleSources(sources: readonly ImageSource[]): ImageSource[] {
  const result = [...sources];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }

  return result;
}

export { nextImage, trackDownload };
