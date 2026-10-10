interface Attribution {
  name: string;
  url: string;
  sourceUrl: string;
}

interface BackgroundAsset {
  sourceId: string;
  sourceAssetId: string;
  cacheKey: string;
  width: number;
  height: number;
  color: string | null;
  description: string | null;
  attribution: Attribution | null;
  sourcePayload: unknown;
  createdAt: number;
}

type UncachedBackgroundAsset = Omit<BackgroundAsset, "cacheKey">;

interface HistoryState {
  history: BackgroundAsset[];
}

const HISTORY_LIMIT = 10;

function makeAsset(
  props: Omit<UncachedBackgroundAsset, "color" | "createdAt"> & {
    color?: string | null;
    createdAt?: number;
  },
): UncachedBackgroundAsset {
  return {
    color: null,
    createdAt: Date.now(),
    ...props,
  };
}

export type {
  Attribution,
  BackgroundAsset,
  HistoryState,
  UncachedBackgroundAsset,
};
export { HISTORY_LIMIT, makeAsset };
