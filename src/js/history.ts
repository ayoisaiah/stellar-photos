// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import {
  ACTIVE_CACHE_NAME,
  activeCache,
  deleteCachedImage,
  ownedCacheNames,
  photoCacheKey,
  putCachedImage,
  readCachedImage,
} from "./cache";
import {
  LEGACY_IMAGE_KEY,
  readRawHistory,
  removeLocal,
  writeHistory,
} from "./storage";
import { HISTORY_LIMIT, HISTORY_VERSION } from "./types";

import type {
  HistoryState,
  PhotoMetadata,
  UncachedPhotoMetadata,
} from "./types";

export class UnsupportedHistoryVersionError extends Error {}

export function emptyHistory(): HistoryState {
  return { version: HISTORY_VERSION, currentId: null, history: [] };
}

export function decodeHistory(raw: unknown): HistoryState | null {
  if (raw === undefined) return null;
  if (!raw || typeof raw !== "object")
    throw new Error("Malformed history state");

  const value = raw as Partial<HistoryState> & { version?: unknown };
  if (typeof value.version === "number" && value.version > HISTORY_VERSION) {
    throw new UnsupportedHistoryVersionError(
      `Unsupported history version: ${value.version}`,
    );
  }
  if (value.version !== HISTORY_VERSION || !Array.isArray(value.history))
    throw new Error("Malformed history state");

  return value as HistoryState;
}

export async function readHistory(): Promise<HistoryState> {
  return decodeHistory(await readRawHistory()) ?? emptyHistory();
}

export async function reconcileHistory(): Promise<HistoryState> {
  let decoded: HistoryState | null;
  try {
    decoded = decodeHistory(await readRawHistory());
  } catch (error) {
    if (error instanceof UnsupportedHistoryVersionError) throw error;
    decoded = null;
  }

  const source = decoded ?? emptyHistory();
  const cache = await activeCache();
  const seen = new Set<string>();
  const repaired: PhotoMetadata[] = [];

  for (const item of source.history) {
    if (
      repaired.length >= HISTORY_LIMIT ||
      !isMetadata(item) ||
      seen.has(item.id)
    )
      continue;
    if (!(await cache.match(item.cacheKey))) continue;
    seen.add(item.id);
    repaired.push(item);
  }

  const state: HistoryState = {
    version: HISTORY_VERSION,
    currentId: repaired[0]?.id ?? null,
    history: repaired,
  };

  await writeHistory(state);

  const verified = decodeHistory(await readRawHistory());
  if (!verified) throw new Error("History verification failed");

  const referenced = new Set(verified.history.map((item) => item.cacheKey));

  for (const request of await cache.keys()) {
    if (!referenced.has(request.url)) await cache.delete(request);
  }

  for (const cacheName of await ownedCacheNames()) {
    if (cacheName !== ACTIVE_CACHE_NAME) await caches.delete(cacheName);
  }

  await removeLocal(LEGACY_IMAGE_KEY);

  return verified;
}

export async function promoteImage(
  metadata: UncachedPhotoMetadata,
  image: Response,
): Promise<HistoryState> {
  const current = await readHistory();
  if (current.history.some((entry) => entry.id === metadata.id)) return current;

  const completed = { ...metadata, cacheKey: photoCacheKey(metadata.id) };
  let base = current;

  if (current.history.length >= HISTORY_LIMIT) {
    const oldest = current.history[current.history.length - 1];
    const reservedEntries = current.history.slice(0, HISTORY_LIMIT - 1);
    const reserved: HistoryState = {
      version: HISTORY_VERSION,
      currentId: reservedEntries[0]?.id ?? null,
      history: reservedEntries,
    };

    await writeHistory(reserved);

    if (!(await deleteCachedImage(oldest.cacheKey))) {
      await writeHistory(current);
      throw new Error("Could not reserve image cache capacity");
    }
    base = reserved;
  }

  const priorResponse = await readCachedImage(completed.cacheKey);

  await putCachedImage(completed.cacheKey, image);

  const next: HistoryState = {
    version: HISTORY_VERSION,
    currentId: completed.id,
    history: [completed, ...base.history].slice(0, HISTORY_LIMIT),
  };

  try {
    await writeHistory(next);
    return next;
  } catch (error) {
    if (priorResponse) await putCachedImage(completed.cacheKey, priorResponse);
    else await deleteCachedImage(completed.cacheKey);
    throw error;
  }
}

function isMetadata(value: unknown): value is PhotoMetadata {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<PhotoMetadata>;

  try {
    return (
      typeof item.id === "string" &&
      item.cacheKey === photoCacheKey(item.id) &&
      typeof item.width === "number" &&
      typeof item.height === "number" &&
      typeof item.photographerName === "string" &&
      typeof item.photographerUrl === "string" &&
      typeof item.unsplashUrl === "string" &&
      typeof item.downloadLocation === "string" &&
      typeof item.createdAt === "number"
    );
  } catch {
    return false;
  }
}
