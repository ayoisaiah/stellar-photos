// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { readBoundedImage } from "../cache";
import {
  getImageQuality,
  initializeUnsplashSettings,
  resolveAccessKey,
  STELLAR_COLLECTION,
} from "./unsplash-settings";

import type {
  BackgroundAsset,
  ImageResolution,
  ImageSource,
  UncachedBackgroundAsset,
} from "../types";

interface UnsplashPayload {
  downloadLocation: string;
  imageUrl?: string;
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
  user: { name: string; links: { html: string } };
}

const API_ORIGINS = new Set(["https://api.unsplash.com"]);
const IMAGE_ORIGINS = new Set(["https://images.unsplash.com"]);
const WEB_ORIGINS = new Set(["https://unsplash.com"]);

const unsplashSource: ImageSource = {
  id: "unsplash",
  name: "Unsplash",
  initializeSettings: initializeUnsplashSettings,
  getRandomAsset,
  downloadAsset,
  didDownload,
};

export function imageUrlForResolution(
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
  const endpoint = trustedUrl(
    `https://api.unsplash.com/photos/random?collections=${STELLAR_COLLECTION}`,
    API_ORIGINS,
  );
  const photo = parsePhoto(await (await authenticatedFetch(endpoint)).json());
  const rawImageUrl = trustedUrl(photo.urls.raw, IMAGE_ORIGINS);
  const imageUrl = trustedUrl(
    imageUrlForResolution(rawImageUrl.href, await getImageQuality()),
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
  const response = await fetch(imageUrl, { redirect: "follow" });

  trustedUrl(response.url, IMAGE_ORIGINS);

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
  const response = await fetch(url, {
    headers: authHeaders(await resolveAccessKey()),
    redirect: "follow",
  });

  trustedUrl(response.url, API_ORIGINS);

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
  )
    throw new Error("Malformed Unsplash response");

  return photo as UnsplashPhotoResponse;
}

export { unsplashSource };
