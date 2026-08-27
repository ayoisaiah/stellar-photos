import type { BackgroundAsset, HistoryState } from "./assets";
import { HISTORY_LIMIT } from "./assets";
import {
  assetCacheKey,
  createThumbnail,
  deleteCachedImage,
  deleteCachedThumbnail,
  putCachedImage,
  putCachedThumbnail,
} from "./cache";
import { setImageSourceId } from "./settings";
import type { ImageSource } from "./sources";
import {
  getActiveImageSource,
  getImageSource,
  initializeImageSourceSettings,
} from "./sources";
import {
  readHistory,
  readPinnedAsset,
  writeHistory,
  writePinnedAsset,
} from "./storage";

const LOCK_NAME = "stellar_actions_lock";

let queueTail: Promise<void> = Promise.resolve();
let activeRotation: Promise<BackgroundAsset | null> | null = null;
let pendingRotation = false;

async function ensureCurrent(): Promise<BackgroundAsset | null> {
  return enqueue(async () => {
    const pinned = await readPinnedAsset();
    if (pinned) return pinned;

    const state = await readHistory();

    return state.history[0] ?? acquireAsset(state);
  });
}

function rotate(): Promise<BackgroundAsset | null> {
  if (activeRotation) {
    pendingRotation = true;
    return activeRotation;
  }

  activeRotation = (async () => {
    pendingRotation = false;

    const acquire = () => acquireAsset();
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

async function switchSource(sourceId: string): Promise<BackgroundAsset> {
  const source = getImageSource(sourceId);

  if (!source) throw new Error("Unknown image source");

  return enqueue(async () => {
    const current = await fetchAndPromote(source, { respectPin: false });

    await setImageSourceId(source.id);
    await writePinnedAsset(null);

    return current;
  });
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

async function initializeSettings(): Promise<void> {
  const { initializeCoreSettings } = await import("./settings");

  await enqueue(async () => {
    await initializeCoreSettings();
    await initializeImageSourceSettings();
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
): Promise<BackgroundAsset | null> {
  state ??= await readHistory();
  const source = await getActiveImageSource();
  const current = state.history[0];
  const pinned = await readPinnedAsset();

  if (pinned) return pinned;

  if (current && source.shouldRotate && !(await source.shouldRotate(current))) {
    return current;
  }

  return fetchAndPromote(source);
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

export {
  ensureCurrent,
  initializeSettings,
  rotate,
  switchSource,
  trackDownload,
};
