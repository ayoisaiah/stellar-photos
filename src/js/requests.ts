import { readBoundedImage } from "./cache";
import {
  getImageResolution,
  resolveAccessKey,
  STELLAR_COLLECTION,
} from "./settings";
import type {
  ImageResolution,
  UncachedPhotoMetadata,
  UnsplashPhotoResponse,
} from "./types";

const API_ORIGINS = new Set(["https://api.unsplash.com"]);
const IMAGE_ORIGINS = new Set(["https://images.unsplash.com"]);
const WEB_ORIGINS = new Set(["https://unsplash.com"]);

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

export async function fetchRandomPhotoMetadata(): Promise<{
  metadata: UncachedPhotoMetadata;
  imageUrl: string;
}> {
  const endpoint = trustedUrl(
    `https://api.unsplash.com/photos/random?collections=${STELLAR_COLLECTION}`,
    API_ORIGINS,
  );
  const photo = parsePhoto(await (await authenticatedFetch(endpoint)).json());
  const rawImageUrl = trustedUrl(photo.urls.raw, IMAGE_ORIGINS);
  const imageUrl = trustedUrl(
    imageUrlForResolution(rawImageUrl.href, await getImageResolution()),
    IMAGE_ORIGINS,
  );
  return {
    metadata: {
      id: photo.id,
      width: photo.width,
      height: photo.height,
      color: typeof photo.color === "string" ? photo.color : null,
      description: photo.description ?? photo.alt_description ?? null,
      photographerName: photo.user.name,
      photographerUrl: trustedUrl(photo.user.links.html, WEB_ORIGINS).href,
      unsplashUrl: trustedUrl(photo.links.html, WEB_ORIGINS).href,
      downloadLocation: trustedUrl(photo.links.download_location, API_ORIGINS)
        .href,
      createdAt: Date.now(),
    },
    imageUrl: imageUrl.href,
  };
}

export async function fetchPhotoImage(location: string): Promise<Response> {
  const imageUrl = trustedUrl(location, IMAGE_ORIGINS);
  const response = await fetch(imageUrl, { redirect: "follow" });
  trustedUrl(response.url, IMAGE_ORIGINS);
  return readBoundedImage(response);
}

export async function trackDownload(location: string): Promise<void> {
  await authenticatedFetch(trustedUrl(location, API_ORIGINS));
}
