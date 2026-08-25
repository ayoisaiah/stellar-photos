import type { BackgroundAsset } from "./types";

export function assetIdentity(
  asset: Pick<BackgroundAsset, "sourceId" | "sourceAssetId">,
): string {
  return `${encodeURIComponent(asset.sourceId)}:${encodeURIComponent(asset.sourceAssetId)}`;
}
