import {
  getLocal,
  getSync,
  removeLocal,
  removeSync,
  setLocal,
  setSync,
} from "../storage";

import type { ImageResolution } from "../types";

export interface UnsplashSettings {
  version: 1;
  imageQuality: ImageResolution;
}

interface UnsplashLocalSettings {
  version: 1;
  accessKeyOverride: string;
}

declare const __UNSPLASH_ACCESS_KEY__: string;

const LEGACY_ACCESS_KEY_OVERRIDE_KEY = "unsplashAccessKey";
const LEGACY_IMAGE_RESOLUTION_KEY = "imageResolution";

export const STELLAR_COLLECTION = "998309";
export const UNSPLASH_SETTINGS_KEY = "sourceSettings:unsplash";
export const DEFAULT_UNSPLASH_SETTINGS: Readonly<UnsplashSettings> =
  Object.freeze({ version: 1, imageQuality: "standard" });

export async function getImageQuality(): Promise<ImageResolution> {
  const values = await getSync<Record<string, unknown>>(UNSPLASH_SETTINGS_KEY);
  const settings = parseUnsplashSettings(values[UNSPLASH_SETTINGS_KEY]);

  return settings?.imageQuality ?? DEFAULT_UNSPLASH_SETTINGS.imageQuality;
}

export async function setImageQuality(
  imageQuality: ImageResolution,
): Promise<void> {
  const values = await getSync<Record<string, unknown>>(UNSPLASH_SETTINGS_KEY);
  const current = parseUnsplashSettings(values[UNSPLASH_SETTINGS_KEY]);

  await setSync({
    [UNSPLASH_SETTINGS_KEY]: {
      ...(current ?? DEFAULT_UNSPLASH_SETTINGS),
      imageQuality,
    } satisfies UnsplashSettings,
  });
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
  ]);
  const current = parseUnsplashSettings(syncValues[UNSPLASH_SETTINGS_KEY]);

  if (!current) {
    const legacyResolution = syncValues[LEGACY_IMAGE_RESOLUTION_KEY];
    const imageQuality = isImageResolution(legacyResolution)
      ? legacyResolution
      : DEFAULT_UNSPLASH_SETTINGS.imageQuality;

    await setSync({
      [UNSPLASH_SETTINGS_KEY]: {
        ...DEFAULT_UNSPLASH_SETTINGS,
        imageQuality,
      } satisfies UnsplashSettings,
    });
  }

  await removeSync(LEGACY_IMAGE_RESOLUTION_KEY);

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

  return settings as UnsplashSettings;
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
