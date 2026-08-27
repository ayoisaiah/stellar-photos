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

function getSync<T extends Record<string, unknown>>(
  keys: string | string[] | null,
): Promise<T> {
  return getFrom<T>("sync", keys);
}

function setSync(data: Record<string, unknown>): Promise<void> {
  return setIn("sync", data);
}

function removeSync(keys: string | string[]): Promise<void> {
  return removeFrom("sync", keys);
}

function getLocal<T extends Record<string, unknown>>(
  keys: string | string[] | null,
): Promise<T> {
  return getFrom<T>("local", keys);
}

function setLocal(data: Record<string, unknown>): Promise<void> {
  return setIn("local", data);
}

function removeLocal(keys: string | string[]): Promise<void> {
  return removeFrom("local", keys);
}

async function readHistory(): Promise<HistoryState> {
  const result = await getLocal<{ [HISTORY_STORAGE_KEY]?: unknown }>(
    HISTORY_STORAGE_KEY,
  );
  const validated = validateHistoryState(result[HISTORY_STORAGE_KEY]);

  return validated ?? { history: [] };
}

async function writeHistory(state: HistoryState): Promise<void> {
  await setLocal({ [HISTORY_STORAGE_KEY]: state });
}

async function readPinned(): Promise<boolean> {
  const result = await getLocal<Record<string, unknown>>(PINNED_STORAGE_KEY);

  if (typeof result[PINNED_STORAGE_KEY] === "boolean") {
    return Boolean(result[PINNED_STORAGE_KEY]);
  }

  return false;
}

async function writePinned(pinned: boolean): Promise<void> {
  await setLocal({ [PINNED_STORAGE_KEY]: pinned });
}

async function readStagedKeys(): Promise<string[]> {
  try {
    if (chrome.storage?.session) {
      const res = await new Promise<Record<string, unknown>>((resolve) => {
        chrome.storage.session.get(STAGED_KEYS_STORAGE_KEY, (result) => {
          resolve(result ?? {});
        });
      });
      const keys = res[STAGED_KEYS_STORAGE_KEY];
      if (Array.isArray(keys)) {
        return keys.filter((k): k is string => typeof k === "string");
      }
    }
  } catch {
    // Fall back to local
  }

  const localRes = await getLocal<Record<string, unknown>>(
    STAGED_KEYS_STORAGE_KEY,
  );
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
  try {
    if (chrome.storage?.session) {
      await new Promise<void>((resolve) => {
        chrome.storage.session.set({ [STAGED_KEYS_STORAGE_KEY]: next }, () =>
          resolve(),
        );
      });
      return;
    }
  } catch {
    // Fall back to local
  }

  await setLocal({ [STAGED_KEYS_STORAGE_KEY]: next });
}

async function removeStagedKey(key: string): Promise<void> {
  const current = await readStagedKeys();
  const next = current.filter((k) => k !== key);
  try {
    if (chrome.storage?.session) {
      await new Promise<void>((resolve) => {
        chrome.storage.session.set({ [STAGED_KEYS_STORAGE_KEY]: next }, () =>
          resolve(),
        );
      });
      return;
    }
  } catch {
    // Fall back to local
  }

  await setLocal({ [STAGED_KEYS_STORAGE_KEY]: next });
}

function runtimeError(): Error | null {
  return chrome.runtime.lastError
    ? new Error(chrome.runtime.lastError.message)
    : null;
}

function getFrom<T extends Record<string, unknown>>(
  area: "local" | "sync",
  keys: string | string[] | null,
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.storage[area].get(keys, (result) => {
      const error = runtimeError();

      if (error) {
        reject(error);
      } else {
        resolve(result as T);
      }
    });
  });
}

function setIn(
  area: "local" | "sync",
  data: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage[area].set(data, () => {
      const error = runtimeError();

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function removeFrom(
  area: "local" | "sync",
  keys: string | string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage[area].remove(keys, () => {
      const error = runtimeError();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export {
  addStagedKey,
  getLocal,
  getSync,
  HISTORY_STORAGE_KEY,
  isBackgroundAsset,
  PINNED_STORAGE_KEY,
  readHistory,
  readPinned,
  readStagedKeys,
  removeLocal,
  removeStagedKey,
  removeSync,
  STAGED_KEYS_STORAGE_KEY,
  setLocal,
  setSync,
  validateHistoryState,
  writeHistory,
  writePinned,
};
