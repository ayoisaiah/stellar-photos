import { assetIdentity } from "./assets";
import {
  assetCacheKey,
  deleteCachedImage,
  putCachedImage,
  readCachedImage,
} from "./cache";
import { promoteImage, readHistory, reconcileHistory } from "./history";
import { getImageSourceId, setImageSourceId } from "./settings";
import {
  getActiveImageSource,
  getImageSource,
  initializeImageSourceSettings,
} from "./sources";
import { readPaused } from "./storage";

import type { BackgroundAsset, HistoryState, ImageSource } from "./types";

let queueTail: Promise<void> = Promise.resolve();
let initialization: Promise<HistoryState> | null = null;
let activeRotation: Promise<BackgroundAsset | null> | null = null;
let pendingRotation = false;

export function initialize(): Promise<HistoryState> {
  initialization ??= enqueue(reconcileHistory);

  return initialization;
}

export async function ensureCurrent(): Promise<BackgroundAsset | null> {
  await initialize();

  return enqueue(async () => {
    const state = await readHistory();

    return state.history[0] ?? acquireUnique(state);
  });
}

export function rotate(force = false): Promise<BackgroundAsset | null> {
  if (activeRotation) {
    pendingRotation = true;
    return activeRotation;
  }

  activeRotation = (async () => {
    await initialize();

    const acquire = () => acquireUnique(undefined, undefined, force);
    let current = await enqueue(acquire);

    if (pendingRotation) {
      pendingRotation = false;
      current = await enqueue(acquire);
    }

    return current;
  })().finally(() => {
    activeRotation = null;
  });

  return activeRotation;
}

export async function prepareSource(
  sourceId: string,
): Promise<BackgroundAsset | null> {
  const source = getImageSource(sourceId);

  if (!source) throw new Error("Unknown image source");

  await initialize();

  return enqueue(async () => prepareUnique(await readHistory(), source));
}

export async function commitSource(asset: BackgroundAsset): Promise<void> {
  const source = getImageSource(asset.sourceId);

  if (
    !source ||
    asset.cacheKey !== assetCacheKey(source.id, asset.sourceAssetId)
  )
    throw new Error("Unknown image source");

  await initialize();

  await enqueue(async () => {
    const image = await readCachedImage(asset.cacheKey);

    if (!image) throw new Error("Prepared image is no longer available");

    const previousSourceId = await getImageSourceId();
    const { cacheKey: _cacheKey, ...metadata } = asset;

    await setImageSourceId(source.id);

    try {
      const promoted = await promoteImage(metadata, image);
      const current = promoted.history[0];

      if (!current) throw new Error("Promoted image is missing from history");

      void source.didDownload?.(current).catch(() => undefined);
    } catch (error) {
      await setImageSourceId(previousSourceId);
      throw error;
    }
  });
}

export async function discardSource(asset: BackgroundAsset): Promise<void> {
  const canonicalKey = assetCacheKey(asset.sourceId, asset.sourceAssetId);

  if (asset.cacheKey !== canonicalKey) return;

  await enqueue(async () => {
    const state = await readHistory();

    if (state.history.some((item) => item.cacheKey === asset.cacheKey)) return;

    await deleteCachedImage(asset.cacheKey);
  });
}

export async function trackDownload(asset: BackgroundAsset): Promise<void> {
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

export async function initializeSettingsAndHistory(): Promise<void> {
  const { initializeCoreSettings } = await import("./settings");

  await enqueue(async () => {
    await initializeCoreSettings();
    await initializeImageSourceSettings();
  });
  await initialize();
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queueTail.then(operation, operation);

  queueTail = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

async function acquireUnique(
  state?: HistoryState,
  selectedSource?: ImageSource,
  force = false,
): Promise<BackgroundAsset | null> {
  state ??= await readHistory();
  const source = selectedSource ?? (await getActiveImageSource());
  const current = state.history[0];

  if (!force) {
    const isPaused = await readPaused();
    if (isPaused && current) {
      return current;
    }

    if (
      current &&
      source.shouldRotate &&
      !(await source.shouldRotate(current))
    ) {
      return current;
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await source.getRandomAsset();
    if (candidate.sourceId !== source.id)
      throw new Error("Image source returned an asset for another source");

    if (current && assetIdentity(current) === assetIdentity(candidate)) {
      continue;
    }

    const image = await source.downloadAsset(candidate);
    const promoted = await promoteImage(candidate, image);
    const promotedCurrent = promoted.history[0];

    if (!promotedCurrent)
      throw new Error("Promoted image is missing from history");

    void source.didDownload?.(promotedCurrent).catch(() => undefined);

    return promotedCurrent;
  }

  const fallbackCandidate = await source.getRandomAsset();
  const fallbackImage = await source.downloadAsset(fallbackCandidate);
  const fallbackPromoted = await promoteImage(fallbackCandidate, fallbackImage);

  return fallbackPromoted.history[0] ?? state.history[0] ?? null;
}

async function prepareUnique(
  state: HistoryState,
  source: ImageSource,
): Promise<BackgroundAsset> {
  const current = state.history[0];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = await source.getRandomAsset();

    if (candidate.sourceId !== source.id)
      throw new Error("Image source returned an asset for another source");

    if (current && assetIdentity(current) === assetIdentity(candidate)) {
      continue;
    }

    const image = await source.downloadAsset(candidate);
    const prepared = {
      ...candidate,
      cacheKey: assetCacheKey(candidate.sourceId, candidate.sourceAssetId),
    };

    await putCachedImage(prepared.cacheKey, image);

    return prepared;
  }

  throw new Error("Image source did not return a new photograph");
}
