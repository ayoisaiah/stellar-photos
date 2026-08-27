import type { BackgroundAsset, HistoryState } from "./assets";
import { HISTORY_LIMIT } from "./assets";

const HISTORY_STORAGE_KEY = "stellarHistory";
const PINNED_STORAGE_KEY = "stellarPinned";
const STAGED_KEYS_STORAGE_KEY = "stellarStagedKeys";

function isBackgroundAsset(value: unknown): value is BackgroundAsset {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.sourceId === "string" &&
    typeof candidate.sourceAssetId === "string" &&
    typeof candidate.cacheKey === "string" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    typeof candidate.payloadVersion === "number" &&
    typeof candidate.createdAt === "number"
  );
}

function validateHistoryState(raw: unknown): HistoryState | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.history)) return null;

  const validEntries = candidate.history.filter(isBackgroundAsset);

  return {
    history: validEntries.slice(0, HISTORY_LIMIT),
  };
}

async function readHistory(): Promise<HistoryState> {
  const result = await chrome.storage.local.get(HISTORY_STORAGE_KEY);
  const validated = validateHistoryState(result[HISTORY_STORAGE_KEY]);

  return validated ?? { history: [] };
}

async function writeHistory(state: HistoryState): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: state });
}

async function readPinned(): Promise<boolean> {
  const result = await chrome.storage.local.get(PINNED_STORAGE_KEY);

  if (typeof result[PINNED_STORAGE_KEY] === "boolean") {
    return Boolean(result[PINNED_STORAGE_KEY]);
  }

  return false;
}

async function writePinned(pinned: boolean): Promise<void> {
  await chrome.storage.local.set({ [PINNED_STORAGE_KEY]: pinned });
}

async function readStagedKeys(): Promise<string[]> {
  if (chrome.storage?.session) {
    try {
      const res = await chrome.storage.session.get(STAGED_KEYS_STORAGE_KEY);
      const keys = res[STAGED_KEYS_STORAGE_KEY];
      if (Array.isArray(keys)) {
        return keys.filter((k): k is string => typeof k === "string");
      }
    } catch {
      // Fall back to local
    }
  }

  const localRes = await chrome.storage.local.get(STAGED_KEYS_STORAGE_KEY);
  const localKeys = localRes[STAGED_KEYS_STORAGE_KEY];
  if (Array.isArray(localKeys)) {
    return localKeys.filter((k): k is string => typeof k === "string");
  }

  return [];
}

async function addStagedKey(key: string): Promise<void> {
  const current = await readStagedKeys();
  if (current.includes(key)) return;

  const next = [...current, key];
  if (chrome.storage?.session) {
    try {
      await chrome.storage.session.set({ [STAGED_KEYS_STORAGE_KEY]: next });
      return;
    } catch {
      // Fall back to local
    }
  }

  await chrome.storage.local.set({ [STAGED_KEYS_STORAGE_KEY]: next });
}

async function removeStagedKey(key: string): Promise<void> {
  const current = await readStagedKeys();
  const next = current.filter((k) => k !== key);
  if (chrome.storage?.session) {
    try {
      await chrome.storage.session.set({ [STAGED_KEYS_STORAGE_KEY]: next });
      return;
    } catch {
      // Fall back to local
    }
  }

  await chrome.storage.local.set({ [STAGED_KEYS_STORAGE_KEY]: next });
}

export {
  addStagedKey,
  HISTORY_STORAGE_KEY,
  isBackgroundAsset,
  PINNED_STORAGE_KEY,
  readHistory,
  readPinned,
  readStagedKeys,
  removeStagedKey,
  STAGED_KEYS_STORAGE_KEY,
  validateHistoryState,
  writeHistory,
  writePinned,
};
