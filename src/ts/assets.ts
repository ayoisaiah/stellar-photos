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

function assetIdentity(
  asset: Pick<BackgroundAsset, "sourceId" | "sourceAssetId">,
): string {
  return `${encodeURIComponent(asset.sourceId)}:${encodeURIComponent(asset.sourceAssetId)}`;
}

export type { Attribution, BackgroundAsset, UncachedBackgroundAsset };
export { assetIdentity };
