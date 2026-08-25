import { promoteImage, readHistory, reconcileHistory } from "./history";
import {
  fetchPhotoImage,
  fetchRandomPhotoMetadata,
  trackDownload,
} from "./requests";
import type { HistoryState, PhotoMetadata } from "./types";

let queueTail: Promise<void> = Promise.resolve();
let initialization: Promise<HistoryState> | null = null;
let activeRotation: Promise<PhotoMetadata | null> | null = null;
let pendingRotation = false;

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queueTail.then(operation, operation);
  queueTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function initialize(): Promise<HistoryState> {
  initialization ??= enqueue(reconcileHistory);
  return initialization;
}

async function acquireUnique(
  state?: HistoryState,
): Promise<PhotoMetadata | null> {
  state ??= await readHistory();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = await fetchRandomPhotoMetadata();
    if (state.history.some((item) => item.id === candidate.metadata.id))
      continue;
    const image = await fetchPhotoImage(candidate.imageUrl);
    const promoted = await promoteImage(candidate.metadata, image);
    void trackDownload(promoted.history[0].downloadLocation).catch(
      () => undefined,
    );
    return promoted.history[0];
  }
  return state.history[0] ?? null;
}

export async function ensureCurrent(): Promise<PhotoMetadata | null> {
  await initialize();
  return enqueue(async () => {
    const state = await readHistory();
    return state.history[0] ?? acquireUnique(state);
  });
}

export function rotate(): Promise<PhotoMetadata | null> {
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
