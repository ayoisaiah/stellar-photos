// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { isPhotoFrequency } from "./photo-frequency";

import type { PhotoFrequency } from "./photo-frequency";

type ImageResolution = "standard" | "high" | "max";

type PhotoOrientation = "landscape" | "portrait" | "squarish";

type ContentFilter = "low" | "high";

interface UnsplashSettings {
  version: 1;
  imageQuality: ImageResolution;
  photoFrequency: PhotoFrequency;
  collections: string;
  topics: string;
  username: string;
  query: string;
  orientation: PhotoOrientation | "";
  contentFilter: ContentFilter;
}

interface UnsplashLocalSettings {
  version: 1;
  accessKeyOverride: string;
}

declare const __UNSPLASH_ACCESS_KEY__: string;

const STELLAR_COLLECTION = "998309";
const UNSPLASH_SETTINGS_KEY = "sourceSettings:unsplash";
const DEFAULT_UNSPLASH_SETTINGS: Readonly<UnsplashSettings> = {
  version: 1,
  imageQuality: "standard",
  photoFrequency: "newtab",
  collections: STELLAR_COLLECTION,
  topics: "",
  username: "",
  query: "",
  orientation: "",
  contentFilter: "low",
};

async function getUnsplashSettings(): Promise<UnsplashSettings> {
  const values = await chrome.storage.sync.get(UNSPLASH_SETTINGS_KEY);
  const settings = parseUnsplashSettings(values[UNSPLASH_SETTINGS_KEY]);

  return settings ?? DEFAULT_UNSPLASH_SETTINGS;
}

async function setUnsplashSettings(
  partial: Partial<Omit<UnsplashSettings, "version">>,
): Promise<void> {
  const current = await getUnsplashSettings();

  await chrome.storage.sync.set({
    [UNSPLASH_SETTINGS_KEY]: {
      ...current,
      ...partial,
      version: 1,
    } satisfies UnsplashSettings,
  });
}

async function getPhotoFrequency(): Promise<PhotoFrequency> {
  const settings = await getUnsplashSettings();

  return settings.photoFrequency;
}

async function resolveAccessKey(): Promise<string> {
  const values = await chrome.storage.local.get(UNSPLASH_SETTINGS_KEY);
  const settings = parseUnsplashLocalSettings(values[UNSPLASH_SETTINGS_KEY]);
  const override = settings?.accessKeyOverride;

  if (typeof override === "string" && override.trim()) return override.trim();
  if (__UNSPLASH_ACCESS_KEY__.trim()) return __UNSPLASH_ACCESS_KEY__.trim();

  throw new Error("No Unsplash access key is configured");
}

function parseUnsplashSettings(value: unknown): UnsplashSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<UnsplashSettings>;

  if (typeof settings.version === "number" && settings.version > 1) {
    throw new Error(
      `Unsupported Unsplash settings version: ${settings.version}`,
    );
  }

  if (settings.version !== 1 || !isImageResolution(settings.imageQuality))
    return null;

  const photoFrequency = isPhotoFrequency(settings.photoFrequency)
    ? settings.photoFrequency
    : DEFAULT_UNSPLASH_SETTINGS.photoFrequency;
  const collections =
    typeof settings.collections === "string"
      ? settings.collections
      : DEFAULT_UNSPLASH_SETTINGS.collections;
  const topics =
    typeof settings.topics === "string"
      ? settings.topics
      : DEFAULT_UNSPLASH_SETTINGS.topics;
  const username =
    typeof settings.username === "string"
      ? settings.username
      : DEFAULT_UNSPLASH_SETTINGS.username;
  const query =
    typeof settings.query === "string"
      ? settings.query
      : DEFAULT_UNSPLASH_SETTINGS.query;
  const orientation = isPhotoOrientation(settings.orientation)
    ? settings.orientation
    : DEFAULT_UNSPLASH_SETTINGS.orientation;
  const contentFilter = isContentFilter(settings.contentFilter)
    ? settings.contentFilter
    : DEFAULT_UNSPLASH_SETTINGS.contentFilter;

  return {
    version: 1,
    imageQuality: settings.imageQuality,
    photoFrequency,
    collections,
    topics,
    username,
    query,
    orientation,
    contentFilter,
  };
}

function parseUnsplashLocalSettings(
  value: unknown,
): UnsplashLocalSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<UnsplashLocalSettings>;

  if (typeof settings.version === "number" && settings.version > 1) {
    throw new Error(
      `Unsupported local Unsplash settings version: ${settings.version}`,
    );
  }

  if (settings.version !== 1 || typeof settings.accessKeyOverride !== "string")
    return null;

  return settings as UnsplashLocalSettings;
}

function isImageResolution(value: unknown): value is ImageResolution {
  return value === "standard" || value === "high" || value === "max";
}

function isPhotoOrientation(value: unknown): value is PhotoOrientation | "" {
  return (
    value === "" ||
    value === "landscape" ||
    value === "portrait" ||
    value === "squarish"
  );
}

function isContentFilter(value: unknown): value is ContentFilter {
  return value === "low" || value === "high";
}

export type {
  ContentFilter,
  ImageResolution,
  PhotoFrequency,
  PhotoOrientation,
  UnsplashSettings,
};
export {
  DEFAULT_UNSPLASH_SETTINGS,
  getPhotoFrequency,
  getUnsplashSettings,
  resolveAccessKey,
  STELLAR_COLLECTION,
  setUnsplashSettings,
  UNSPLASH_SETTINGS_KEY,
};
