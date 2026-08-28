// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { isPhotoFrequency } from "./photo-frequency";

import type { PhotoFrequency } from "./photo-frequency";

export interface EarthViewSettings {
  version: 1;
  photoFrequency: PhotoFrequency;
}

export const EARTHVIEW_SETTINGS_KEY = "sourceSettings:earthview";

export const DEFAULT_EARTHVIEW_SETTINGS: Readonly<EarthViewSettings> = {
  version: 1,
  photoFrequency: "newtab",
};

export async function getEarthViewSettings(): Promise<EarthViewSettings> {
  const values = await chrome.storage.sync.get(EARTHVIEW_SETTINGS_KEY);
  const settings = parseEarthViewSettings(values[EARTHVIEW_SETTINGS_KEY]);

  return settings ?? DEFAULT_EARTHVIEW_SETTINGS;
}

export async function setEarthViewSettings(
  partial: Partial<Omit<EarthViewSettings, "version">>,
): Promise<void> {
  const current = await getEarthViewSettings();

  await chrome.storage.sync.set({
    [EARTHVIEW_SETTINGS_KEY]: {
      ...current,
      ...partial,
      version: 1,
    } satisfies EarthViewSettings,
  });
}

export async function getEarthViewPhotoFrequency(): Promise<PhotoFrequency> {
  const settings = await getEarthViewSettings();

  return settings.photoFrequency;
}

export async function setEarthViewPhotoFrequency(
  photoFrequency: PhotoFrequency,
): Promise<void> {
  await setEarthViewSettings({ photoFrequency });
}

function parseEarthViewSettings(value: unknown): EarthViewSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<EarthViewSettings>;

  if (typeof settings.version === "number" && settings.version > 1) {
    throw new Error(
      `Unsupported Earth View source settings version: ${settings.version}`,
    );
  }

  if (settings.version !== 1) return null;

  const photoFrequency = isPhotoFrequency(settings.photoFrequency)
    ? settings.photoFrequency
    : DEFAULT_EARTHVIEW_SETTINGS.photoFrequency;

  return {
    version: 1,
    photoFrequency,
  };
}
