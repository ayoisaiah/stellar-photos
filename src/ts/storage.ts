import type { BackgroundAsset, HistoryState } from "./assets";
import { HISTORY_LIMIT } from "./assets";

const HISTORY_STORAGE_KEY = "stellarHistory";
const PINNED_STORAGE_KEY = "stellarPinned";

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

async function readPinnedAsset(): Promise<BackgroundAsset | null> {
  const result = await chrome.storage.local.get(PINNED_STORAGE_KEY);
  const pinned = result[PINNED_STORAGE_KEY];

  return isBackgroundAsset(pinned) ? pinned : null;
}

async function writePinnedAsset(asset: BackgroundAsset | null): Promise<void> {
  await chrome.storage.local.set({ [PINNED_STORAGE_KEY]: asset });
}

export {
  HISTORY_STORAGE_KEY,
  isBackgroundAsset,
  PINNED_STORAGE_KEY,
  readHistory,
  readPinnedAsset,
  validateHistoryState,
  writeHistory,
  writePinnedAsset,
};
