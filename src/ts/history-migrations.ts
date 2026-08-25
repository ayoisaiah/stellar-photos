// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { HISTORY_VERSION } from "./types";

import type { BackgroundAsset, HistoryState } from "./types";

export function upgradeLegacyHistory(value: {
  version?: unknown;
  history?: unknown;
}): HistoryState {
  if (!Array.isArray(value.history)) throw new Error("Malformed history state");

  return {
    version: HISTORY_VERSION,
    history: value.history.flatMap((item) => {
      try {
        return [upgradeLegacyMetadata(item)];
      } catch {
        return [];
      }
    }),
  };
}

function upgradeLegacyMetadata(value: unknown): BackgroundAsset {
  if (!value || typeof value !== "object")
    throw new Error("Malformed history state");

  const item = value as Record<string, unknown>;

  if (
    typeof item.id !== "string" ||
    typeof item.cacheKey !== "string" ||
    typeof item.width !== "number" ||
    typeof item.height !== "number" ||
    typeof item.photographerName !== "string" ||
    typeof item.photographerUrl !== "string" ||
    typeof item.unsplashUrl !== "string" ||
    typeof item.downloadLocation !== "string" ||
    typeof item.createdAt !== "number"
  )
    throw new Error("Malformed history state");

  return {
    sourceId: "unsplash",
    sourceAssetId: item.id,
    cacheKey: item.cacheKey,
    width: item.width,
    height: item.height,
    color: typeof item.color === "string" ? item.color : null,
    description: typeof item.description === "string" ? item.description : null,
    attribution: {
      name: item.photographerName,
      url: item.photographerUrl,
      sourceUrl: item.unsplashUrl,
    },
    payloadVersion: 1,
    sourcePayload: { downloadLocation: item.downloadLocation },
    createdAt: item.createdAt,
  };
}
