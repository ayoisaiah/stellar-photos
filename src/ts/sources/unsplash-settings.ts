import {
  getLocal,
  getSync,
  removeLocal,
  removeSync,
  setLocal,
  setSync,
} from "../storage";

import type { ImageResolution } from "../types";

export type PhotoFrequency =
  | "newtab"
  | "every15minutes"
  | "everyhour"
  | "everyday";

export type PhotoOrientation = "landscape" | "portrait" | "squarish";

export type ContentFilter = "low" | "high";

export interface UnsplashSettings {
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

const LEGACY_ACCESS_KEY_OVERRIDE_KEY = "unsplashAccessKey";
const LEGACY_IMAGE_RESOLUTION_KEY = "imageResolution";
const LEGACY_PHOTO_FREQUENCY_KEY = "photoFrequency";
const LEGACY_IMAGE_FREQUENCY_KEY = "imageFrequency";
const LEGACY_COLLECTIONS_KEY = "collections";

export const STELLAR_COLLECTION = "998309";
export const UNSPLASH_SETTINGS_KEY = "sourceSettings:unsplash";
export const DEFAULT_UNSPLASH_SETTINGS: Readonly<UnsplashSettings> =
  Object.freeze({
    version: 1,
    imageQuality: "standard",
    photoFrequency: "newtab",
    collections: STELLAR_COLLECTION,
    topics: "",
    username: "",
    query: "",
    orientation: "",
    contentFilter: "low",
  });

export async function getUnsplashSettings(): Promise<UnsplashSettings> {
  const values = await getSync<Record<string, unknown>>(UNSPLASH_SETTINGS_KEY);
  const settings = parseUnsplashSettings(values[UNSPLASH_SETTINGS_KEY]);

  return settings ?? DEFAULT_UNSPLASH_SETTINGS;
}

export async function setUnsplashSettings(
  partial: Partial<Omit<UnsplashSettings, "version">>,
): Promise<void> {
  const current = await getUnsplashSettings();

  await setSync({
    [UNSPLASH_SETTINGS_KEY]: {
      ...current,
      ...partial,
      version: 1,
    } satisfies UnsplashSettings,
  });
}

export async function getImageQuality(): Promise<ImageResolution> {
  const settings = await getUnsplashSettings();

  return settings.imageQuality;
}

export async function setImageQuality(
  imageQuality: ImageResolution,
): Promise<void> {
  await setUnsplashSettings({ imageQuality });
}

export async function getPhotoFrequency(): Promise<PhotoFrequency> {
  const settings = await getUnsplashSettings();

  return settings.photoFrequency;
}

export async function setPhotoFrequency(
  photoFrequency: PhotoFrequency,
): Promise<void> {
  await setUnsplashSettings({ photoFrequency });
}

export async function resolveAccessKey(): Promise<string> {
  const values = await getLocal<Record<string, unknown>>([
    UNSPLASH_SETTINGS_KEY,
    LEGACY_ACCESS_KEY_OVERRIDE_KEY,
  ]);
  const settings = parseUnsplashLocalSettings(values[UNSPLASH_SETTINGS_KEY]);
  const legacyOverride = values[LEGACY_ACCESS_KEY_OVERRIDE_KEY];
  const override =
    settings?.accessKeyOverride ??
    (typeof legacyOverride === "string" ? legacyOverride : "");

  if (typeof override === "string" && override.trim()) return override.trim();
  if (__UNSPLASH_ACCESS_KEY__.trim()) return __UNSPLASH_ACCESS_KEY__.trim();

  throw new Error("No Unsplash access key is configured");
}

export async function initializeUnsplashSettings(): Promise<void> {
  const syncValues = await getSync<Record<string, unknown>>([
    UNSPLASH_SETTINGS_KEY,
    LEGACY_IMAGE_RESOLUTION_KEY,
    LEGACY_PHOTO_FREQUENCY_KEY,
    LEGACY_IMAGE_FREQUENCY_KEY,
    LEGACY_COLLECTIONS_KEY,
  ]);
  const current = parseUnsplashSettings(syncValues[UNSPLASH_SETTINGS_KEY]);

  if (!current) {
    const legacyResolution = syncValues[LEGACY_IMAGE_RESOLUTION_KEY];
    const imageQuality = isImageResolution(legacyResolution)
      ? legacyResolution
      : DEFAULT_UNSPLASH_SETTINGS.imageQuality;
    const legacyFrequency =
      syncValues[LEGACY_PHOTO_FREQUENCY_KEY] ??
      syncValues[LEGACY_IMAGE_FREQUENCY_KEY];
    const photoFrequency = isPhotoFrequency(legacyFrequency)
      ? legacyFrequency
      : DEFAULT_UNSPLASH_SETTINGS.photoFrequency;
    const legacyCollections = syncValues[LEGACY_COLLECTIONS_KEY];
    const collections =
      typeof legacyCollections === "string" && legacyCollections.trim()
        ? legacyCollections.trim()
        : DEFAULT_UNSPLASH_SETTINGS.collections;

    await setSync({
      [UNSPLASH_SETTINGS_KEY]: {
        ...DEFAULT_UNSPLASH_SETTINGS,
        imageQuality,
        photoFrequency,
        collections,
      } satisfies UnsplashSettings,
    });
  }

  await removeSync([
    LEGACY_IMAGE_RESOLUTION_KEY,
    LEGACY_PHOTO_FREQUENCY_KEY,
    LEGACY_IMAGE_FREQUENCY_KEY,
    LEGACY_COLLECTIONS_KEY,
  ]);

  const localValues = await getLocal<Record<string, unknown>>([
    UNSPLASH_SETTINGS_KEY,
    LEGACY_ACCESS_KEY_OVERRIDE_KEY,
  ]);
  const localSettings = parseUnsplashLocalSettings(
    localValues[UNSPLASH_SETTINGS_KEY],
  );
  const legacyOverride = localValues[LEGACY_ACCESS_KEY_OVERRIDE_KEY];

  if (
    !localSettings &&
    typeof legacyOverride === "string" &&
    legacyOverride.trim()
  ) {
    await setLocal({
      [UNSPLASH_SETTINGS_KEY]: {
        version: 1,
        accessKeyOverride: legacyOverride.trim(),
      } satisfies UnsplashLocalSettings,
    });
  }

  await removeLocal(LEGACY_ACCESS_KEY_OVERRIDE_KEY);
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

function isPhotoFrequency(value: unknown): value is PhotoFrequency {
  return (
    value === "newtab" ||
    value === "every15minutes" ||
    value === "everyhour" ||
    value === "everyday"
  );
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
