import type { BackgroundAsset, UncachedBackgroundAsset } from "../assets";
import { readBoundedImage } from "../cache";
import { fetchWithTimeout } from "../requests";
import type { ImageSource } from "../sources";
import type { ImageResolution, UnsplashSettings } from "./unsplash-settings";
import {
  getPhotoFrequency,
  getUnsplashSettings,
  initializeUnsplashSettings,
  resolveAccessKey,
  STELLAR_COLLECTION,
} from "./unsplash-settings";

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

const API_ORIGIN = "https://api.unsplash.com";

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
    const url = new URL(
      `/photos/${encodeURIComponent(asset.sourceAssetId)}`,
      API_ORIGIN,
    );
    const response = await authenticatedFetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as UnsplashPhotoResponse;

    return extractPhotoInfo(data);
  } catch {
    return null;
  }
}

function buildRandomPhotoUrl(settings: Partial<UnsplashSettings> = {}): URL {
  const url = new URL("/photos/random", API_ORIGIN);
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
  const endpoint = buildRandomPhotoUrl(settings);
  const photo = (await (
    await authenticatedFetch(endpoint)
  ).json()) as UnsplashPhotoResponse;
  const fullImageUrl = fullResolutionImageUrl(
    photo.urls.full ?? photo.urls.raw,
  );
  const imageUrl = imageUrlForResolution(photo.urls.raw, settings.imageQuality);

  return {
    sourceId: unsplashSource.id,
    sourceAssetId: photo.id,
    width: photo.width,
    height: photo.height,
    color: typeof photo.color === "string" ? photo.color : null,
    description: photo.description ?? photo.alt_description ?? null,
    attribution: {
      name: photo.user.name,
      url: photo.user.links.html,
      sourceUrl: photo.links.html,
    },
    payloadVersion: 1,
    sourcePayload: {
      downloadLocation: photo.links.download_location,
      imageUrl,
      fullImageUrl,
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

  const response = await fetchWithTimeout(payload.imageUrl, {
    redirect: "follow",
  });

  return readBoundedImage(response);
}

async function downloadFullAsset(asset: BackgroundAsset): Promise<Response> {
  const payload = parsePayload(asset);
  const baseOrFullUrl = payload.fullImageUrl ?? payload.imageUrl;
  if (!baseOrFullUrl)
    throw new Error("Unsplash asset payload has no image URL");

  const fullUrl = fullResolutionImageUrl(baseOrFullUrl);
  const response = await fetchWithTimeout(fullUrl, { redirect: "follow" });

  return readBoundedImage(response);
}

async function didDownload(asset: BackgroundAsset): Promise<void> {
  const payload = parsePayload(asset);

  await authenticatedFetch(new URL(payload.downloadLocation));
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

function authHeaders(key: string): HeadersInit {
  return { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" };
}

async function authenticatedFetch(url: URL): Promise<Response> {
  if (url.origin !== API_ORIGIN) {
    throw new Error("Refusing to send Unsplash credentials to another origin");
  }

  const response = await fetchWithTimeout(url, {
    headers: authHeaders(await resolveAccessKey()),
    redirect: "follow",
  });

  if (response.url && new URL(response.url).origin !== API_ORIGIN) {
    throw new Error("Unsplash API redirected to another origin");
  }

  if (!response.ok)
    throw new Error(`Unsplash request failed (${response.status})`);

  return response;
}

function extractPhotoInfo(photo: UnsplashPhotoResponse): UnsplashInfoData {
  const location: UnsplashLocation | null = photo.location
    ? {
        name: photo.location.name ?? null,
        city: photo.location.city ?? null,
        country: photo.location.country ?? null,
      }
    : null;
  const exif: UnsplashExif | null = photo.exif
    ? {
        make: photo.exif.make ?? null,
        model: photo.exif.model ?? null,
        exposureTime: photo.exif.exposure_time ?? null,
        aperture: photo.exif.aperture ?? null,
        focalLength:
          photo.exif.focal_length == null
            ? null
            : String(photo.exif.focal_length),
        iso: photo.exif.iso ?? null,
      }
    : null;

  return {
    user: {
      name: photo.user.name,
      username: photo.user.username ?? null,
      profileImage:
        photo.user.profile_image?.medium ??
        photo.user.profile_image?.small ??
        null,
      link: photo.user.links.html,
    },
    location,
    exif,
    views: photo.views ?? null,
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
  buildRandomPhotoUrl,
  cleanIdentifier,
  fetchUnsplashPhotoDetails,
  fullResolutionImageUrl,
  getUnsplashPhotoInfo,
  imageUrlForResolution,
  normalizeCsv,
  unsplashSource,
};
