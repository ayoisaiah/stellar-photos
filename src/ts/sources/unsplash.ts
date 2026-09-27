import {
  type BackgroundAsset,
  makeAsset,
  type UncachedBackgroundAsset,
} from "../assets";
import { attributionUrl } from "../attribution";
import { readBoundedImage } from "../cache";
import { fetchWithTimeout } from "../requests";
import type { ImageSource } from "../sources";
import type { ImageResolution, UnsplashSettings } from "./unsplash-settings";
import {
  getUnsplashSettings,
  MissingKeyError,
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
  imageUrl: string;
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
const verifiedCollections = new Set<string>([STELLAR_COLLECTION]);
const verifiedTopics = new Map<string, string>();

const unsplashSource: ImageSource = {
  id: "unsplash",
  name: "Unsplash",
  description: "Photography from the Unsplash community",
  settingsTag: "stellar-unsplash-settings",
  infoTitle: "About this photo",
  get supportsDownload() {
    return Boolean(this.getDownloadUrl);
  },
  supportsInfo: true,
  getCredit(asset) {
    if (!asset.attribution) return null;

    const user = getUnsplashPhotoInfo(asset)?.user;

    return {
      name: user?.name ?? asset.attribution.name,
      url: attributionUrl(
        user?.link || asset.attribution.url,
        unsplashSource.id,
      ),
      avatar: user?.profileImage,
      sourceUrl: attributionUrl(asset.attribution.sourceUrl, unsplashSource.id),
      sourceName: unsplashSource.name,
    };
  },
  getRandomAsset,
  downloadAsset,
  getDownloadUrl,
  didDownload,
  fetchDetails: fetchUnsplashPhotoDetails,
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

  return makeAsset({
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
    sourcePayload: {
      downloadLocation: photo.links.download_location,
      imageUrl: photo.urls.raw,
      info: extractPhotoInfo(photo),
    } satisfies UnsplashPayload,
  });
}

async function downloadAsset(
  asset: UncachedBackgroundAsset,
): Promise<Response> {
  const payload = parsePayload(asset);
  if (typeof payload.imageUrl !== "string") {
    throw new Error("Unsplash asset payload has no image URL");
  }

  const settings = await getUnsplashSettings();
  const url = imageUrlForResolution(payload.imageUrl, settings.imageQuality);
  const response = await fetchWithTimeout(url, {
    redirect: "follow",
  });

  return readBoundedImage(response);
}

function getDownloadUrl(asset: BackgroundAsset): string {
  const payload = parsePayload(asset);
  if (!payload.imageUrl)
    throw new Error("Unsplash asset payload has no image URL");

  return fullResolutionImageUrl(payload.imageUrl);
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

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`Unsplash request failed (${status})`);
    this.name = "HttpError";
  }
}

function explain(error: unknown, what: string): string {
  if (error instanceof HttpError) {
    if (error.status === 404) return `${what} was not found on Unsplash.`;
    if ([401, 403, 429].includes(error.status)) {
      return "API access denied or rate limit reached.";
    }
  }

  if (error instanceof MissingKeyError) {
    return "No Unsplash access key configured.";
  }

  return `Could not verify ${what}. Please check your network connection.`;
}

async function authenticatedFetch(
  url: URL,
  accessKey?: string,
): Promise<Response> {
  const key = accessKey ?? (await resolveAccessKey());
  const response = await fetchWithTimeout(url, {
    headers: authHeaders(key),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new HttpError(response.status);
  }

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

interface UnsplashValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

async function verifyUnsplashResource(
  type: "collection" | "topic",
  idOrUrl: string,
): Promise<UnsplashValidationResult> {
  const id = cleanIdentifier(idOrUrl);
  const typeLabel =
    type === "collection" ? "collection ID" : "topic slug or ID";

  if (!id) {
    return { valid: false, error: `Please enter a valid ${typeLabel}.` };
  }

  const cached =
    type === "collection"
      ? verifiedCollections.has(id)
        ? id
        : undefined
      : verifiedTopics.get(id);
  if (cached) {
    return { valid: true, normalized: cached };
  }

  const endpoint = type === "collection" ? "collections" : "topics";
  const name = type === "collection" ? "Collection" : "Topic";

  try {
    const url = new URL(`/${endpoint}/${encodeURIComponent(id)}`, API_ORIGIN);
    const response = await authenticatedFetch(url);
    const data = (await response.json()) as {
      id?: string;
      slug?: string;
      total_photos?: number;
    };

    if (typeof data.total_photos === "number" && data.total_photos === 0) {
      return { valid: false, error: `${name} "${id}" contains no photos.` };
    }

    const normalized = type === "collection" ? id : data.id || id;
    if (type === "collection") {
      verifiedCollections.add(id);
    } else {
      verifiedTopics.set(id, normalized);
      if (data.slug) verifiedTopics.set(data.slug, normalized);
      if (data.id) verifiedTopics.set(data.id, normalized);
    }

    return { valid: true, normalized };
  } catch (error) {
    return {
      valid: false,
      error: explain(error, `${name} "${id}"`),
    };
  }
}

async function verifyUnsplashCollection(
  idOrUrl: string,
): Promise<UnsplashValidationResult> {
  return verifyUnsplashResource("collection", idOrUrl);
}

async function verifyUnsplashTopic(
  slugOrUrl: string,
): Promise<UnsplashValidationResult> {
  return verifyUnsplashResource("topic", slugOrUrl);
}

async function verifyUnsplashAccessKey(
  accessKey: string,
): Promise<{ valid: boolean; error?: string }> {
  const key = accessKey.trim();

  if (!key) {
    return { valid: false, error: "Please enter a valid access key." };
  }

  try {
    const url = new URL("/photos?per_page=1", API_ORIGIN);
    await authenticatedFetch(url, key);

    return { valid: true };
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) {
        return { valid: false, error: "Invalid Unsplash access key." };
      }

      if (error.status === 403 || error.status === 429) {
        return {
          valid: false,
          error: "API access denied or rate limit reached.",
        };
      }
    }

    return {
      valid: false,
      error:
        "Could not verify access key. Please check your network connection.",
    };
  }
}

function clearVerificationCache(): void {
  verifiedCollections.clear();
  verifiedCollections.add(STELLAR_COLLECTION);
  verifiedTopics.clear();
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
  clearVerificationCache,
  fetchUnsplashPhotoDetails,
  fullResolutionImageUrl,
  getUnsplashPhotoInfo,
  imageUrlForResolution,
  normalizeCsv,
  unsplashSource,
  verifyUnsplashAccessKey,
  verifyUnsplashCollection,
  verifyUnsplashTopic,
};
