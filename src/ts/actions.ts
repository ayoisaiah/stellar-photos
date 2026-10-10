import type { BackgroundAsset } from "./assets";
import { HISTORY_LIMIT } from "./assets";
import {
  assetCacheKey,
  createThumbnail,
  deleteCachedImage,
  putCachedImage,
} from "./cache";
import { coreStore } from "./settings";
import type { ImageSource } from "./sources";
import { getActiveImageSources, getImageSource } from "./sources";
import { shouldRotateAtFrequency } from "./sources/photo-frequency";
import { setSourceError } from "./sources/source-health";
import {
  HISTORY_STORAGE_KEY,
  isBackgroundAsset,
  PINNED_STORAGE_KEY,
  validateHistoryState,
  writeHistory,
} from "./storage";
import { serialized } from "./store";

const LOCK_NAME = "stellar_actions_lock";

function nextImage(): Promise<void> {
  return serialized(LOCK_NAME, async () => {
    const [storageData, coreSettings] = await Promise.all([
      chrome.storage.local.get([PINNED_STORAGE_KEY, HISTORY_STORAGE_KEY]),
      coreStore.get(),
    ]);

    if (isBackgroundAsset(storageData[PINNED_STORAGE_KEY])) return;

    const validated = validateHistoryState(storageData[HISTORY_STORAGE_KEY]);
    const history = validated?.history ?? [];
    const current = history[0];

    if (
      current &&
      !shouldRotateAtFrequency(current, coreSettings.photoFrequency)
    ) {
      return;
    }

    const sources = await getActiveImageSources(coreSettings);
    let lastError: unknown;

    for (const source of shuffleSources(sources)) {
      let retrieved = false;

      try {
        const candidate = await source.getRandomAsset();
        const blob = await source.downloadAsset(candidate);
        retrieved = true;
        await setSourceError(source.id, "").catch(console.error);

        const asset: BackgroundAsset = {
          ...candidate,
          cacheKey: assetCacheKey(candidate.sourceId, candidate.sourceAssetId),
        };

        await cacheAndRecordImage(asset, blob, history);

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
  blob: Blob,
  history: readonly BackgroundAsset[],
): Promise<void> {
  const [, thumb] = await Promise.all([
    putCachedImage(
      asset.cacheKey,
      new Response(blob, { headers: { "content-type": blob.type } }),
    ),
    createThumbnail(blob),
  ]);

  let assetWithDimensions = asset;

  if (thumb) {
    if ((!asset.width || !asset.height) && thumb.width && thumb.height) {
      assetWithDimensions = {
        ...asset,
        width: thumb.width,
        height: thumb.height,
      };
    }

    try {
      await putCachedImage(
        asset.cacheKey,
        new Response(thumb.blob, {
          headers: {
            "content-type": "image/webp",
            "content-length": String(thumb.blob.size),
          },
        }),
        "thumbnail",
      );
    } catch (error) {
      console.error(error);
    }
  }

  const nextHistory = [assetWithDimensions, ...history].slice(0, HISTORY_LIMIT);
  const evicted = history.length >= HISTORY_LIMIT ? history.at(-1) : null;
  await writeHistory({ history: nextHistory });

  if (
    evicted &&
    !nextHistory.some((item) => item.cacheKey === evicted.cacheKey)
  ) {
    try {
      await Promise.all([
        deleteCachedImage(evicted.cacheKey),
        deleteCachedImage(evicted.cacheKey, "thumbnail"),
      ]);
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
