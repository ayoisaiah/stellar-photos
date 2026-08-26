import type { HistoryState } from "./types";

export const HISTORY_STORAGE_KEY = "stellarHistory";
export const PAUSED_STORAGE_KEY = "stellarPaused";
export const LEGACY_IMAGE_KEY = "nextImage";
export const LEGACY_IMAGE_PAUSED_KEY = "imagePaused";

export const STAGED_KEYS_STORAGE_KEY = "stellarStagedKeys";

export function getSync<T extends Record<string, unknown>>(
  keys: string | string[] | null,
): Promise<T> {
  return getFrom<T>("sync", keys);
}

export function setSync(data: Record<string, unknown>): Promise<void> {
  return setIn("sync", data);
}

export function removeSync(keys: string | string[]): Promise<void> {
  return removeFrom("sync", keys);
}

export function getLocal<T extends Record<string, unknown>>(
  keys: string | string[] | null,
): Promise<T> {
  return getFrom<T>("local", keys);
}

export function setLocal(data: Record<string, unknown>): Promise<void> {
  return setIn("local", data);
}

export function removeLocal(keys: string | string[]): Promise<void> {
  return removeFrom("local", keys);
}

export async function readRawHistory(): Promise<unknown> {
  const result = await getLocal<Record<string, unknown>>(HISTORY_STORAGE_KEY);

  return result[HISTORY_STORAGE_KEY];
}

export async function writeHistory(state: HistoryState): Promise<void> {
  await setLocal({ [HISTORY_STORAGE_KEY]: state });
}

export async function readPaused(): Promise<boolean> {
  const result = await getLocal<Record<string, unknown>>([
    PAUSED_STORAGE_KEY,
    LEGACY_IMAGE_PAUSED_KEY,
  ]);

  if (typeof result[PAUSED_STORAGE_KEY] === "boolean") {
    return Boolean(result[PAUSED_STORAGE_KEY]);
  }

  if (typeof result[LEGACY_IMAGE_PAUSED_KEY] === "boolean") {
    return Boolean(result[LEGACY_IMAGE_PAUSED_KEY]);
  }

  return false;
}

export async function writePaused(paused: boolean): Promise<void> {
  await setLocal({ [PAUSED_STORAGE_KEY]: paused });
}

export async function readStagedKeys(): Promise<string[]> {
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

export async function addStagedKey(key: string): Promise<void> {
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

export async function removeStagedKey(key: string): Promise<void> {
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
