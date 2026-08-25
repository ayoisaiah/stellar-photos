import { assetIdentity } from "./assets";
import { promoteImage, readHistory, reconcileHistory } from "./history";
import { getActiveImageSource } from "./sources";

import type { BackgroundAsset, HistoryState } from "./types";

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

export function rotate(): Promise<BackgroundAsset | null> {
  if (activeRotation) {
    pendingRotation = true;
    return activeRotation;
  }

  activeRotation = (async () => {
    await initialize();

    let current = await enqueue(acquireUnique);
    if (pendingRotation) {
      pendingRotation = false;
      current = await enqueue(acquireUnique);
    }

    return current;
  })().finally(() => {
    activeRotation = null;
  });

  return activeRotation;
}

export async function initializeSettingsAndHistory(): Promise<void> {
  const { setDefaultExtensionSettings } = await import("./settings");

  await enqueue(setDefaultExtensionSettings);
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
): Promise<BackgroundAsset | null> {
  state ??= await readHistory();
  const source = await getActiveImageSource();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = await source.getRandomAsset();
    if (candidate.sourceId !== source.id)
      throw new Error("Image source returned an asset for another source");

    if (
      state.history.some(
        (item) => assetIdentity(item) === assetIdentity(candidate),
      )
    )
      continue;

    const image = await source.downloadAsset(candidate);
    const promoted = await promoteImage(candidate, image);
    const current = promoted.history[0];

    if (!current) throw new Error("Promoted image is missing from history");

    void source.didDownload?.(current).catch(() => undefined);

    return current;
  }

  return state.history[0] ?? null;
}
