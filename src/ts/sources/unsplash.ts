// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { readBoundedImage } from "../cache";
import { fetchWithTimeout } from "../requests";
import {
  getPhotoFrequency,
  getUnsplashSettings,
  initializeUnsplashSettings,
  resolveAccessKey,
  STELLAR_COLLECTION,
} from "./unsplash-settings";

import type { BackgroundAsset, UncachedBackgroundAsset } from "../assets";
import type { ImageSource } from "../sources";
import type { ImageResolution, UnsplashSettings } from "./unsplash-settings";

interface UnsplashUser {
  name: string;
  username: string | null;
  profileImage: string | null;
  link: string;
}

interface UnsplashExif {
  make: string | null;
  model: string | null;
  exposureTime: string | null;
  aperture: string | null;
  focalLength: string | null;
  iso: number | null;
}

interface UnsplashLocation {
  name: string | null;
  city: string | null;
  country: string | null;
}

interface UnsplashInfoData {
  user: UnsplashUser | null;
  location: UnsplashLocation | null;
  exif: UnsplashExif | null;
  views: number | null;
  downloads?: number | null;
  likes?: number | null;
  description: string | null;
}

interface UnsplashPayload {
  downloadLocation: string;
  imageUrl?: string;
  fullImageUrl?: string;
  info?: UnsplashInfoData;
}

interface UnsplashPhotoResponse {
  id: string;
  width: number;
  height: number;
  color: string | null;
  description: string | null;
  alt_description: string | null;
  urls: { raw: string; full?: string };
  links: { html: string; download_location: string };
  user: {
    name: string;
    username?: string;
    links: { html: string };
    profile_image?: {
      small?: string;
      medium?: string;
      large?: string;
    };
  };
  likes?: number;
  downloads?: number;
  views?: number;
  location?: {
    name?: string | null;
    city?: string | null;
    country?: string | null;
  };
  exif?: {
    make?: string | null;
    model?: string | null;
    exposure_time?: string | null;
    aperture?: string | null;
    focal_length?: string | number | null;
    iso?: number | null;
  };
}

const API_ORIGINS = new Set(["https://api.unsplash.com"]);
const IMAGE_ORIGINS = new Set(["https://images.unsplash.com"]);
const WEB_ORIGINS = new Set(["https://unsplash.com"]);

const unsplashSource: ImageSource = {
  id: "unsplash",
  name: "Unsplash",
  supportsDownload: true,
  supportsInfo: true,
  initializeSettings: initializeUnsplashSettings,
  shouldRotate,
  getRandomAsset,
  downloadAsset,
  downloadFullAsset,
  didDownload,
};

function getUnsplashPhotoInfo(
  asset: BackgroundAsset | null,
): UnsplashInfoData | null {
  if (!asset || asset.sourceId !== unsplashSource.id) return null;
  if (!asset.sourcePayload || typeof asset.sourcePayload !== "object")
    return null;

  const payload = asset.sourcePayload as Partial<UnsplashPayload>;

  return payload.info ?? null;
}

async function fetchUnsplashPhotoDetails(
  asset: BackgroundAsset,
): Promise<UnsplashInfoData | null> {
  if (asset.sourceId !== unsplashSource.id) return null;

  try {
    const url = trustedUrl(
      `https://api.unsplash.com/photos/${encodeURIComponent(asset.sourceAssetId)}`,
      API_ORIGINS,
    );
    const response = await authenticatedFetch(url);
    if (!response.ok) return null;

    const data = parsePhoto(await response.json());

    return extractPhotoInfo(data);
  } catch {
    return null;
  }
}

function buildRandomPhotoUrl(settings: Partial<UnsplashSettings> = {}): URL {
  const url = new URL("https://api.unsplash.com/photos/random");
  const query = settings.query?.trim() ?? "";
  const topics = normalizeCsv(settings.topics);
  const collections = normalizeCsv(settings.collections);
  const username = settings.username?.trim() ?? "";
  const orientation = settings.orientation;
  const contentFilter = settings.contentFilter ?? "low";

  if (query) {
    url.searchParams.set("query", query);
  } else {
    if (topics) {
      url.searchParams.set("topics", topics);
    }
    if (collections) {
      url.searchParams.set("collections", collections);
    } else if (!topics && !username) {
      url.searchParams.set("collections", STELLAR_COLLECTION);
    }
  }

  if (username) {
    url.searchParams.set("username", username);
  }

  if (
    orientation === "landscape" ||
    orientation === "portrait" ||
    orientation === "squarish"
  ) {
    url.searchParams.set("orientation", orientation);
  }

  if (contentFilter === "high" || contentFilter === "low") {
    url.searchParams.set("content_filter", contentFilter);
  }

  return url;
}

async function shouldRotate(current: BackgroundAsset): Promise<boolean> {
  if (current.sourceId !== unsplashSource.id) return true;

  const frequency = await getPhotoFrequency();
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

function fullResolutionImageUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  url.searchParams.delete("w");
  url.searchParams.delete("h");
  url.searchParams.delete("fit");

  return url.href;
}

function imageUrlForResolution(
  rawUrl: string,
  resolution: ImageResolution,
): string {
  if (resolution === "max") return rawUrl;

  const url = new URL(rawUrl);

  url.searchParams.set("fit", "max");
  url.searchParams.set("w", resolution === "high" ? "4000" : "2000");

  return url.href;
}

async function getRandomAsset(): Promise<UncachedBackgroundAsset> {
  const settings = await getUnsplashSettings();
  const endpoint = trustedUrl(buildRandomPhotoUrl(settings).href, API_ORIGINS);
  const photo = parsePhoto(await (await authenticatedFetch(endpoint)).json());
  const rawImageUrl = trustedUrl(photo.urls.raw, IMAGE_ORIGINS);
  const fullImageUrl = trustedUrl(
    fullResolutionImageUrl(photo.urls.full ?? photo.urls.raw),
    IMAGE_ORIGINS,
  );
  const imageUrl = trustedUrl(
    imageUrlForResolution(rawImageUrl.href, settings.imageQuality),
    IMAGE_ORIGINS,
  );

  return {
    sourceId: unsplashSource.id,
    sourceAssetId: photo.id,
    width: photo.width,
    height: photo.height,
    color: typeof photo.color === "string" ? photo.color : null,
    description: photo.description ?? photo.alt_description ?? null,
    attribution: {
      name: photo.user.name,
      url: trustedUrl(photo.user.links.html, WEB_ORIGINS).href,
      sourceUrl: trustedUrl(photo.links.html, WEB_ORIGINS).href,
    },
    payloadVersion: 1,
    sourcePayload: {
      downloadLocation: trustedUrl(photo.links.download_location, API_ORIGINS)
        .href,
      imageUrl: imageUrl.href,
      fullImageUrl: fullImageUrl.href,
      info: extractPhotoInfo(photo),
    } satisfies UnsplashPayload,
    createdAt: Date.now(),
  };
}

async function downloadAsset(
  asset: UncachedBackgroundAsset,
): Promise<Response> {
  const payload = parsePayload(asset);
  if (typeof payload.imageUrl !== "string")
    throw new Error("Unsplash asset payload has no image URL");

  const imageUrl = trustedUrl(payload.imageUrl, IMAGE_ORIGINS);
  const response = await fetchWithTimeout(imageUrl, { redirect: "follow" });

  if (response.url) {
    trustedUrl(response.url, IMAGE_ORIGINS);
  }

  return readBoundedImage(response);
}

async function downloadFullAsset(asset: BackgroundAsset): Promise<Response> {
  const payload = parsePayload(asset);
  const baseOrFullUrl = payload.fullImageUrl ?? payload.imageUrl;
  if (!baseOrFullUrl)
    throw new Error("Unsplash asset payload has no image URL");

  const fullUrl = fullResolutionImageUrl(baseOrFullUrl);
  const imageUrl = trustedUrl(fullUrl, IMAGE_ORIGINS);
  const response = await fetchWithTimeout(imageUrl, { redirect: "follow" });

  if (response.url) {
    trustedUrl(response.url, IMAGE_ORIGINS);
  }

  if (!response.ok)
    throw new Error(`Image request failed (${response.status})`);

  return readBoundedImage(response);
}

async function didDownload(asset: BackgroundAsset): Promise<void> {
  const payload = parsePayload(asset);

  await authenticatedFetch(trustedUrl(payload.downloadLocation, API_ORIGINS));
}

function parsePayload(asset: UncachedBackgroundAsset): UnsplashPayload {
  if (
    asset.sourceId !== unsplashSource.id ||
    asset.payloadVersion !== 1 ||
    !asset.sourcePayload ||
    typeof asset.sourcePayload !== "object"
  ) {
    throw new Error("Unsupported Unsplash asset payload");
  }

  const payload = asset.sourcePayload as Partial<UnsplashPayload>;

  if (typeof payload.downloadLocation !== "string") {
    throw new Error("Malformed Unsplash asset payload");
  }

  return payload as UnsplashPayload;
}

function trustedUrl(value: string, origins: Set<string>): URL {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !origins.has(url.origin)
  ) {
    throw new Error("Unsplash returned an untrusted URL");
  }

  return url;
}

function authHeaders(key: string): HeadersInit {
  return { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" };
}

async function authenticatedFetch(url: URL): Promise<Response> {
  const response = await fetchWithTimeout(url, {
    headers: authHeaders(await resolveAccessKey()),
    redirect: "follow",
  });

  if (response.url) {
    trustedUrl(response.url, API_ORIGINS);
  }

  if (!response.ok)
    throw new Error(`Unsplash request failed (${response.status})`);

  return response;
}

function parsePhoto(value: unknown): UnsplashPhotoResponse {
  if (!value || typeof value !== "object")
    throw new Error("Malformed Unsplash response");

  const photo = value as Partial<UnsplashPhotoResponse>;

  if (
    typeof photo.id !== "string" ||
    typeof photo.width !== "number" ||
    typeof photo.height !== "number" ||
    !photo.urls ||
    typeof photo.urls.raw !== "string" ||
    !photo.links ||
    typeof photo.links.html !== "string" ||
    typeof photo.links.download_location !== "string" ||
    !photo.user ||
    typeof photo.user.name !== "string" ||
    !photo.user.links ||
    typeof photo.user.links.html !== "string"
  ) {
    throw new Error("Malformed Unsplash response");
  }

  return photo as UnsplashPhotoResponse;
}

function extractPhotoInfo(photo: UnsplashPhotoResponse): UnsplashInfoData {
  const location: UnsplashLocation | null =
    photo.location && typeof photo.location === "object"
      ? {
          name:
            typeof photo.location.name === "string"
              ? photo.location.name
              : null,
          city:
            typeof photo.location.city === "string"
              ? photo.location.city
              : null,
          country:
            typeof photo.location.country === "string"
              ? photo.location.country
              : null,
        }
      : null;

  const exif: UnsplashExif | null =
    photo.exif && typeof photo.exif === "object"
      ? {
          make: typeof photo.exif.make === "string" ? photo.exif.make : null,
          model: typeof photo.exif.model === "string" ? photo.exif.model : null,
          exposureTime:
            typeof photo.exif.exposure_time === "string"
              ? photo.exif.exposure_time
              : null,
          aperture:
            typeof photo.exif.aperture === "string"
              ? photo.exif.aperture
              : null,
          focalLength:
            typeof photo.exif.focal_length === "string"
              ? photo.exif.focal_length
              : typeof photo.exif.focal_length === "number"
                ? String(photo.exif.focal_length)
                : null,
          iso: typeof photo.exif.iso === "number" ? photo.exif.iso : null,
        }
      : null;

  let profileImage: string | null = null;
  if (
    photo.user?.profile_image &&
    typeof photo.user.profile_image === "object"
  ) {
    const candidate =
      typeof photo.user.profile_image.medium === "string"
        ? photo.user.profile_image.medium
        : typeof photo.user.profile_image.small === "string"
          ? photo.user.profile_image.small
          : null;

    if (candidate) {
      try {
        profileImage = trustedUrl(candidate, IMAGE_ORIGINS).toString();
      } catch {
        profileImage = null;
      }
    }
  }

  let userLink = "";
  if (photo.user?.links && typeof photo.user.links.html === "string") {
    try {
      userLink = trustedUrl(photo.user.links.html, WEB_ORIGINS).toString();
    } catch {
      userLink = "";
    }
  }

  const user: UnsplashUser | null = photo.user
    ? {
        name: photo.user.name,
        username:
          typeof photo.user.username === "string" ? photo.user.username : null,
        profileImage,
        link: userLink,
      }
    : null;

  return {
    user,
    location,
    exif,
    views: typeof photo.views === "number" ? photo.views : null,
    description: photo.description ?? photo.alt_description ?? null,
  };
}

function cleanIdentifier(value: string): string {
  let cleaned = value.trim();
  if (!cleaned) return "";

  if (cleaned.includes("/")) {
    try {
      const url = new URL(cleaned);
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[0] === "collections" && segments[1]) {
        cleaned = segments[1];
      } else if (segments[0] === "t" && segments[1]) {
        cleaned = segments[1];
      } else if (segments[0]?.startsWith("@")) {
        cleaned = segments[0].slice(1);
      } else {
        cleaned = segments.pop() || cleaned;
      }
    } catch {
      const segments = cleaned.split("/").filter(Boolean);
      cleaned = segments.pop() || cleaned;
    }
  }

  if (cleaned.startsWith("@")) {
    cleaned = cleaned.slice(1);
  }

  return cleaned.trim();
}

function normalizeCsv(value?: string | null): string {
  if (!value) return "";

  return value
    .split(",")
    .map((item) => cleanIdentifier(item))
    .filter(Boolean)
    .join(",");
}

export type {
  UnsplashExif,
  UnsplashInfoData,
  UnsplashLocation,
  UnsplashPayload,
  UnsplashUser,
};
export {
  API_ORIGINS,
  buildRandomPhotoUrl,
  cleanIdentifier,
  fetchUnsplashPhotoDetails,
  fullResolutionImageUrl,
  getUnsplashPhotoInfo,
  IMAGE_ORIGINS,
  imageUrlForResolution,
  normalizeCsv,
  unsplashSource,
  WEB_ORIGINS,
};
