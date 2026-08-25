// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { assetIdentity } from "./assets";
import {
  ACTIVE_CACHE_NAME,
  activeCache,
  assetCacheKey,
  deleteCachedImage,
  legacyPhotoCacheKey,
  ownedCacheNames,
  putCachedImage,
  readCachedImage,
} from "./cache";
import { upgradeLegacyHistory } from "./history-migrations";
import {
  LEGACY_IMAGE_KEY,
  readRawHistory,
  removeLocal,
  writeHistory,
} from "./storage";
import { HISTORY_LIMIT, HISTORY_VERSION } from "./types";

import type {
  BackgroundAsset,
  HistoryState,
  UncachedBackgroundAsset,
} from "./types";

export class UnsupportedHistoryVersionError extends Error {}

export function emptyHistory(): HistoryState {
  return { version: HISTORY_VERSION, history: [] };
}

export function decodeHistory(raw: unknown): HistoryState | null {
  if (raw === undefined) return null;
  if (!raw || typeof raw !== "object")
    throw new Error("Malformed history state");

  const value = raw as { version?: unknown; history?: unknown };
  if (typeof value.version === "number" && value.version > HISTORY_VERSION) {
    throw new UnsupportedHistoryVersionError(
      `Unsupported history version: ${value.version}`,
    );
  }
  if (value.version === 1) return upgradeLegacyHistory(value);
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
  const repaired: BackgroundAsset[] = [];

  for (const item of source.history) {
    if (
      repaired.length >= HISTORY_LIMIT ||
      !isMetadata(item) ||
      seen.has(assetIdentity(item))
    )
      continue;

    const canonicalCacheKey = assetCacheKey(item.sourceId, item.sourceAssetId);
    const cached = await cache.match(item.cacheKey);

    if (!cached) continue;

    let cacheKey = item.cacheKey;

    if (item.cacheKey !== canonicalCacheKey) {
      try {
        await cache.put(canonicalCacheKey, cached);
        cacheKey = canonicalCacheKey;
      } catch {
        cacheKey = item.cacheKey;
      }
    }

    seen.add(assetIdentity(item));
    repaired.push({ ...item, cacheKey });
  }

  const state: HistoryState = {
    version: HISTORY_VERSION,
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
  metadata: UncachedBackgroundAsset,
  image: Response,
): Promise<HistoryState> {
  const current = await readHistory();
  if (
    current.history.some(
      (entry) => assetIdentity(entry) === assetIdentity(metadata),
    )
  )
    return current;

  const completed = {
    ...metadata,
    cacheKey: assetCacheKey(metadata.sourceId, metadata.sourceAssetId),
  };
  let base = current;

  if (current.history.length >= HISTORY_LIMIT) {
    const oldest = current.history.at(-1);

    if (!oldest) throw new Error("History capacity invariant failed");

    const reservedEntries = current.history.slice(0, HISTORY_LIMIT - 1);
    const reserved: HistoryState = {
      version: HISTORY_VERSION,
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
    history: [completed, ...base.history].slice(0, HISTORY_LIMIT),
  };

  try {
    await writeHistory(next);
    return next;
  } catch (error) {
    if (priorResponse) {
      await putCachedImage(completed.cacheKey, priorResponse);
    } else {
      await deleteCachedImage(completed.cacheKey);
    }

    throw error;
  }
}

function isMetadata(value: unknown): value is BackgroundAsset {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<BackgroundAsset>;

  try {
    const canonicalCacheKey =
      typeof item.sourceId === "string" &&
      typeof item.sourceAssetId === "string"
        ? assetCacheKey(item.sourceId, item.sourceAssetId)
        : null;
    const legacyCacheKey =
      item.sourceId === "unsplash" && typeof item.sourceAssetId === "string"
        ? legacyPhotoCacheKey(item.sourceAssetId)
        : null;

    return (
      typeof item.sourceId === "string" &&
      typeof item.sourceAssetId === "string" &&
      (item.cacheKey === canonicalCacheKey ||
        item.cacheKey === legacyCacheKey) &&
      typeof item.width === "number" &&
      typeof item.height === "number" &&
      isAttribution(item.attribution) &&
      typeof item.payloadVersion === "number" &&
      typeof item.createdAt === "number"
    );
  } catch {
    return false;
  }
}

function isAttribution(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;

  const attribution = value as Record<string, unknown>;

  return (
    typeof attribution.name === "string" &&
    typeof attribution.url === "string" &&
    typeof attribution.sourceUrl === "string"
  );
}
