// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { HISTORY_LIMIT } from "./assets";
import {
  assetCacheKey,
  createThumbnail,
  deleteCachedImage,
  deleteCachedThumbnail,
  putCachedImage,
  putCachedThumbnail,
  readCachedImage,
} from "./cache";
import { getPhotoFrequency } from "./settings";
import { getActiveImageSources, getImageSource } from "./sources";
import { shouldRotateAtFrequency } from "./sources/photo-frequency";
import {
  readHistory,
  readPinnedAsset,
  writeHistory,
  writePinnedAsset,
} from "./storage";

import type { BackgroundAsset, HistoryState } from "./assets";
import type { ImageSource } from "./sources";

const LOCK_NAME = "stellar_actions_lock";

let queueTail: Promise<void> = Promise.resolve();
let activeRotation: Promise<BackgroundAsset | null> | null = null;
let pendingRotation = false;

async function ensureCurrent(): Promise<BackgroundAsset | null> {
  return enqueue(async () => {
    const pinned = await readPinnedAsset();
    if (pinned) {
      const cached = await readCachedImage(pinned.cacheKey);
      if (cached) return pinned;

      await writePinnedAsset(null);
    }

    const state = await readHistory();
    let firstCached = 0;

    while (
      state.history[firstCached] &&
      !(await readCachedImage(state.history[firstCached]!.cacheKey))
    ) {
      firstCached += 1;
    }

    if (firstCached > 0) {
      state.history = state.history.slice(firstCached);
      await writeHistory(state);
    }

    return acquireAsset(state);
  });
}

function rotate(): Promise<BackgroundAsset | null> {
  if (activeRotation) {
    pendingRotation = true;
    return activeRotation;
  }

  activeRotation = (async () => {
    pendingRotation = false;

    const acquire = () => acquireAsset(undefined, { forceRotate: true });
    let current = await enqueue(acquire);

    while (pendingRotation) {
      pendingRotation = false;
      current = await enqueue(acquire);
    }

    return current;
  })().finally(() => {
    pendingRotation = false;
    activeRotation = null;
  });

  return activeRotation;
}

async function trackDownload(asset: BackgroundAsset): Promise<void> {
  const source = getImageSource(asset.sourceId);

  if (!source || !source.supportsDownload) return;

  await enqueue(async () => {
    try {
      await source.didDownload?.(asset);
    } catch {
      // Ignore tracking errors
    }
  });
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
): Promise<HistoryState> {
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

  const { next, evicted } = await appendToHistory(asset);

  if (
    evicted &&
    !next.history.some((item) => item.cacheKey === evicted.cacheKey)
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

  return next;
}

async function acquireAsset(
  state?: HistoryState,
  options: { forceRotate?: boolean } = {},
): Promise<BackgroundAsset | null> {
  state ??= await readHistory();
  const current = state.history[0];
  const pinned = await readPinnedAsset();

  if (pinned && !options.forceRotate) return pinned;

  const activeSources = await getActiveImageSources();
  const activeSourceIds = activeSources.map((s) => s.id);
  const frequency = await getPhotoFrequency();

  if (
    !options.forceRotate &&
    current &&
    activeSourceIds.includes(current.sourceId) &&
    !shouldRotateAtFrequency(current, frequency)
  ) {
    return current;
  }

  return fetchAndPromoteRandom(activeSources);
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

async function fetchAndPromoteRandom(
  activeSources: ImageSource[],
): Promise<BackgroundAsset> {
  const shuffled = shuffleSources(activeSources);
  let lastError: unknown;

  for (const source of shuffled) {
    try {
      return await fetchAndPromote(source);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Failed to fetch image from any active source");
}

async function fetchAndPromote(
  source: ImageSource,
  options: { respectPin?: boolean } = {},
): Promise<BackgroundAsset> {
  const candidate = await source.getRandomAsset();
  if (candidate.sourceId !== source.id)
    throw new Error("Image source returned an asset for another source");

  const image = await source.downloadAsset(candidate);
  if (options.respectPin !== false) {
    const pinned = await readPinnedAsset();
    if (pinned) return pinned;
  }

  const asset: BackgroundAsset = {
    ...candidate,
    cacheKey: assetCacheKey(candidate.sourceId, candidate.sourceAssetId),
  };
  const promoted = await cacheAndRecordImage(asset, image);
  const current = promoted.history[0];

  if (!current) throw new Error("Promoted image is missing from history");

  return current;
}

async function appendToHistory(
  asset: BackgroundAsset,
): Promise<{ next: HistoryState; evicted: BackgroundAsset | null }> {
  const current = await readHistory();
  const nextHistory = [asset, ...current.history].slice(0, HISTORY_LIMIT);
  const evicted =
    current.history.length >= HISTORY_LIMIT
      ? (current.history.at(-1) ?? null)
      : null;

  const next: HistoryState = { history: nextHistory };
  await writeHistory(next);

  return { next, evicted };
}

export { ensureCurrent, rotate, trackDownload };
