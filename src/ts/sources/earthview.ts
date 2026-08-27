import type { BackgroundAsset, UncachedBackgroundAsset } from "../assets";
import { readBoundedImage } from "../cache";
import { fetchWithTimeout } from "../requests";
import type { ImageSource } from "../sources";
import earthViewCatalog from "./earthview-data.json";
import {
  getEarthViewPhotoFrequency,
  initializeEarthViewSettings,
} from "./earthview-settings";

interface EarthViewPhotoEntry {
  id: number;
  country: string;
  region: string;
  map: string;
}

interface EarthViewPayload {
  id: number;
  country: string;
  region: string;
  mapUrl: string;
  imageUrl: string;
}

const GSTATIC_ORIGIN = new Set(["https://www.gstatic.com"]);
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

function getEarthViewCatalog(): readonly EarthViewPhotoEntry[] {
  return catalog;
}

function buildEarthViewImageUrl(id: number | string): string {
  return `https://www.gstatic.com/prettyearth/assets/full/${encodeURIComponent(String(id))}.jpg`;
}

function trustedEarthViewUrl(value: string): URL {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !GSTATIC_ORIGIN.has(url.origin)
  ) {
    throw new Error("Earth View returned an untrusted URL");
  }

  return url;
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
  const imageUrl = trustedEarthViewUrl(
    buildEarthViewImageUrl(asset.sourceAssetId),
  );
  const response = await fetchWithTimeout(imageUrl, { redirect: "follow" });

  if (response.url) {
    trustedEarthViewUrl(response.url);
  }

  return readBoundedImage(response);
}

async function downloadFullEarthViewAsset(
  asset: BackgroundAsset,
): Promise<Response> {
  const imageUrl = trustedEarthViewUrl(
    buildEarthViewImageUrl(asset.sourceAssetId),
  );
  const response = await fetchWithTimeout(imageUrl, { redirect: "follow" });

  if (response.url) {
    trustedEarthViewUrl(response.url);
  }

  return readBoundedImage(response);
}

export type { EarthViewPayload, EarthViewPhotoEntry };
export { buildEarthViewImageUrl, earthviewSource, getEarthViewCatalog };
