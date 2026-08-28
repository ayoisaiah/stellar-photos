import type { BackgroundAsset, UncachedBackgroundAsset } from "../assets";
import { readBoundedImage } from "../cache";
import { fetchWithTimeout } from "../requests";
import type { ImageSource } from "../sources";
import { getEarthViewPhotoFrequency } from "./earthview-settings";
import { shouldRotateAtFrequency } from "./photo-frequency";

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
let cachedCatalog: readonly EarthViewPhotoEntry[] | null = null;

const earthviewSource: ImageSource = {
  id: "earthview",
  name: "Google Earth View",
  supportsDownload: true,
  shouldRotate: shouldRotateEarthView,
  getRandomAsset: getRandomEarthViewAsset,
  downloadAsset: downloadEarthViewAsset,
  downloadFullAsset: downloadEarthViewAsset,
};

async function getEarthViewCatalog(): Promise<readonly EarthViewPhotoEntry[]> {
  if (cachedCatalog) return cachedCatalog;

  const module = await import("./earthview-data.json");
  cachedCatalog = module.default as readonly EarthViewPhotoEntry[];

  return cachedCatalog;
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
  return shouldRotateAtFrequency(
    current,
    earthviewSource.id,
    getEarthViewPhotoFrequency,
  );
}

async function getRandomEarthViewAsset(): Promise<UncachedBackgroundAsset> {
  const catalog = await getEarthViewCatalog();

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

export type { EarthViewPayload, EarthViewPhotoEntry };
export { buildEarthViewImageUrl, earthviewSource, getEarthViewCatalog };
