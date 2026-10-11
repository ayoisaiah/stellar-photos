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
  description: string | null;
}

interface UnsplashPayload {
  downloadLocation: string;
  imageUrl: string;
  info?: UnsplashInfoData;
}

interface UnsplashValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

interface UnsplashQueueState {
  endpoint: string;
  items: UncachedBackgroundAsset[];
}

interface UnsplashPhotoResponse {
  id: string;
  width: number;
  height: number;
  color: string | null;
  description: string | null;
  alt_description: string | null;
  urls: { raw: string };
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
const UNSPLASH_QUEUE_KEY = "sourceQueue:unsplash";
const UNSPLASH_CURSOR_KEY = "sourceQueueCursor:unsplash";
const UNSPLASH_BATCH_COUNT = 30;
const verifiedResources = new Map<string, string>([
  [`collection:${STELLAR_COLLECTION}`, STELLAR_COLLECTION],
]);

const unsplashSource: ImageSource = {
  id: "unsplash",
  name: "Unsplash",
  description: "Photography from the Unsplash community",
  settingsTag: "stellar-unsplash-settings",
  infoTitle: "About this photo",
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
  fetchRandom,
  getDownloadUrl,
  didDownload,
  fetchDetails: fetchUnsplashPhotoDetails,
};

const verifyUnsplashCollection = (idOrUrl: string) =>
  verifyUnsplashResource("collection", idOrUrl);

const verifyUnsplashTopic = (slugOrUrl: string) =>
  verifyUnsplashResource("topic", slugOrUrl);

function getUnsplashPhotoInfo(asset: BackgroundAsset): UnsplashInfoData | null {
  return (asset.sourcePayload as UnsplashPayload).info ?? null;
}

async function fetchUnsplashPhotoDetails(
  asset: BackgroundAsset,
): Promise<UnsplashInfoData | null> {
  try {
    const url = new URL(
      `/photos/${encodeURIComponent(asset.sourceAssetId)}`,
      API_ORIGIN,
    );
    const response = await authenticatedFetch(url);

    const data = (await response.json()) as UnsplashPhotoResponse;

    return extractPhotoInfo(data);
  } catch {
    return null;
  }
}

function photoToAsset(photo: UnsplashPhotoResponse): UncachedBackgroundAsset {
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

  if (orientation) {
    url.searchParams.set("orientation", orientation);
  }

  url.searchParams.set("content_filter", contentFilter);
  url.searchParams.set("count", String(UNSPLASH_BATCH_COUNT));

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

async function fetchRandom(): Promise<{
  asset: UncachedBackgroundAsset;
  blob: Blob;
}> {
  const settings = await getUnsplashSettings();
  const endpoint = buildRandomPhotoUrl(settings);
  const stored = await chrome.storage.local.get([
    UNSPLASH_QUEUE_KEY,
    UNSPLASH_CURSOR_KEY,
  ]);
  const queue = stored[UNSPLASH_QUEUE_KEY] as UnsplashQueueState | undefined;

  let items = queue?.endpoint === endpoint.href ? queue.items : [];
  let cursor = (stored[UNSPLASH_CURSOR_KEY] as number | undefined) ?? 0;
  if (items.length === 0 || cursor >= items.length) {
    const response = await authenticatedFetch(endpoint);
    const photos = (await response.json()) as UnsplashPhotoResponse[];
    if (photos.length === 0) throw new Error("Unsplash returned no photos");

    items = photos.map(photoToAsset);
    cursor = 0;
    await chrome.storage.local.set({
      [UNSPLASH_QUEUE_KEY]: { endpoint: endpoint.href, items },
      [UNSPLASH_CURSOR_KEY]: cursor + 1,
    });
  } else {
    await chrome.storage.local.set({ [UNSPLASH_CURSOR_KEY]: cursor + 1 });
  }

  const candidate = items[cursor]!;
  const { imageUrl } = candidate.sourcePayload as UnsplashPayload;
  const response = await fetchWithTimeout(
    imageUrlForResolution(imageUrl, settings.imageQuality),
    { redirect: "follow" },
  );

  return {
    asset: { ...candidate, createdAt: Date.now() },
    blob: await readBoundedImage(response),
  };
}

function getDownloadUrl(asset: BackgroundAsset): string {
  const payload = asset.sourcePayload as UnsplashPayload;

  return fullResolutionImageUrl(payload.imageUrl);
}

async function didDownload(asset: BackgroundAsset): Promise<void> {
  const payload = asset.sourcePayload as UnsplashPayload;

  await authenticatedFetch(new URL(payload.downloadLocation));
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
  const parts = value
    .trim()
    .replace(/[?#].*$/, "")
    .split("/")
    .filter(Boolean);
  const marker = parts.findIndex(
    (part) => part === "collections" || part === "t",
  );
  const id =
    (marker >= 0 ? parts[marker + 1] : undefined) ??
    parts.find((part) => part.startsWith("@")) ??
    parts.at(-1) ??
    "";

  return id.replace(/^@/, "");
}

function normalizeCsv(value?: string | null): string {
  if (!value) return "";

  return value
    .split(",")
    .map((item) => cleanIdentifier(item))
    .filter(Boolean)
    .join(",");
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

  const cacheKey = `${type}:${id}`;
  const cached = verifiedResources.get(cacheKey);
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

    if (data.total_photos === 0) {
      return { valid: false, error: `${name} "${id}" contains no photos.` };
    }

    const normalized = type === "collection" ? id : data.id || id;
    verifiedResources.set(cacheKey, normalized);
    if (type === "topic") {
      if (data.slug) verifiedResources.set(`topic:${data.slug}`, normalized);
      if (data.id) verifiedResources.set(`topic:${data.id}`, normalized);
    }

    return { valid: true, normalized };
  } catch (error) {
    return {
      valid: false,
      error: explain(error, `${name} "${id}"`),
    };
  }
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
    const invalid = error instanceof HttpError && error.status === 401;

    return {
      valid: false,
      error: invalid
        ? "Invalid Unsplash access key."
        : explain(error, "access key"),
    };
  }
}

export {
  buildRandomPhotoUrl,
  cleanIdentifier,
  fetchUnsplashPhotoDetails,
  fullResolutionImageUrl,
  getUnsplashPhotoInfo,
  imageUrlForResolution,
  normalizeCsv,
  type UnsplashExif,
  type UnsplashInfoData,
  type UnsplashLocation,
  type UnsplashPayload,
  type UnsplashUser,
  unsplashSource,
  verifyUnsplashAccessKey,
  verifyUnsplashCollection,
  verifyUnsplashTopic,
};
