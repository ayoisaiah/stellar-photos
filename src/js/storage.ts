import type { HistoryState } from "./types";

export const HISTORY_STORAGE_KEY = "stellarHistory";
export const ACCESS_KEY_OVERRIDE_KEY = "unsplashAccessKey";
export const LEGACY_IMAGE_KEY = "nextImage";

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
      if (error) reject(error);
      else resolve(result as T);
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
      if (error) reject(error);
      else resolve();
    });
  });
}

export function getSync<T extends Record<string, unknown>>(
  keys: string | string[] | null,
): Promise<T> {
  return getFrom<T>("sync", keys);
}

export function setSync(data: Record<string, unknown>): Promise<void> {
  return setIn("sync", data);
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
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      const error = runtimeError();
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function readRawHistory(): Promise<unknown> {
  const result = await getLocal<Record<string, unknown>>(HISTORY_STORAGE_KEY);
  return result[HISTORY_STORAGE_KEY];
}

export async function writeHistory(state: HistoryState): Promise<void> {
  await setLocal({ [HISTORY_STORAGE_KEY]: state });
}
