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
  payloadVersion: number;
  sourcePayload: unknown;
  createdAt: number;
}

type UncachedBackgroundAsset = Omit<BackgroundAsset, "cacheKey">;

interface HistoryState {
  history: BackgroundAsset[];
}

const HISTORY_LIMIT = 10;

function makeAsset(
  props: Omit<
    UncachedBackgroundAsset,
    "color" | "payloadVersion" | "createdAt"
  > & {
    color?: string | null;
    createdAt?: number;
    payloadVersion?: number;
  },
): UncachedBackgroundAsset {
  return {
    color: null,
    payloadVersion: 1,
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
