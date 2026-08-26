// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import earthViewCatalog from "./earthview-data.json";
import {
  getEarthViewPhotoFrequency,
  initializeEarthViewSettings,
} from "./earthview-settings";

import type {
  BackgroundAsset,
  ImageSource,
  UncachedBackgroundAsset,
} from "../types";

export interface EarthViewPhotoEntry {
  id: number;
  country: string;
  region: string;
  map: string;
}

export interface EarthViewPayload {
  id: number;
  country: string;
  region: string;
  mapUrl: string;
  imageUrl: string;
}

const catalog: readonly EarthViewPhotoEntry[] = earthViewCatalog;

const earthviewSource: ImageSource = {
  id: "earthview",
  name: "Google Earth View",
  supportsDownload: true,
  supportsInfo: false,
  initializeSettings: initializeEarthViewSettings,
  shouldRotate: shouldRotateEarthView,
  getRandomAsset: getRandomEarthViewAsset,
  downloadAsset: downloadEarthViewAsset,
  downloadFullAsset: downloadFullEarthViewAsset,
};

export function getEarthViewCatalog(): readonly EarthViewPhotoEntry[] {
  return catalog;
}

export function buildEarthViewImageUrl(id: number | string): string {
  return `https://www.gstatic.com/prettyearth/assets/full/${id}.jpg`;
}

async function shouldRotateEarthView(
  current: BackgroundAsset,
): Promise<boolean> {
  if (current.sourceId !== earthviewSource.id) return true;

  const frequency = await getEarthViewPhotoFrequency();
  const elapsed = Date.now() - current.createdAt;

  switch (frequency) {
    case "every15minutes":
      return elapsed >= 15 * 60 * 1000;
    case "everyhour":
      return elapsed >= 60 * 60 * 1000;
    case "everyday":
      return elapsed >= 24 * 60 * 60 * 1000;
    case "newtab":
    default:
      return true;
  }
}

async function getRandomEarthViewAsset(): Promise<UncachedBackgroundAsset> {
  if (catalog.length === 0) {
    throw new Error("No Earth View photos available in catalog");
  }

  const randomIndex = Math.floor(Math.random() * catalog.length);
  const item = catalog[randomIndex]!;

  const locationName = item.region
    ? `${item.region}, ${item.country}`
    : item.country || "Earth";

  return {
    sourceId: earthviewSource.id,
    sourceAssetId: String(item.id),
    width: 1800,
    height: 1200,
    color: null,
    description: locationName,
    attribution: {
      name: locationName,
      url: item.map,
      sourceUrl: "https://earth.google.com/",
    },
    payloadVersion: 1,
    sourcePayload: {
      id: item.id,
      country: item.country,
      region: item.region,
      mapUrl: item.map,
      imageUrl: buildEarthViewImageUrl(item.id),
    } satisfies EarthViewPayload,
    createdAt: Date.now(),
  };
}

async function downloadEarthViewAsset(
  asset: UncachedBackgroundAsset,
): Promise<Response> {
  const imageUrl = buildEarthViewImageUrl(asset.sourceAssetId);
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download Earth View photo: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

async function downloadFullEarthViewAsset(
  asset: BackgroundAsset,
): Promise<Response> {
  const imageUrl = buildEarthViewImageUrl(asset.sourceAssetId);
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download full resolution Earth View photo: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

export { earthviewSource };
