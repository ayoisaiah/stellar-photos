import { getSync, setSync } from "./storage";

import type { ImageResolution } from "./types";

export const IMAGE_RESOLUTION_KEY = "imageResolution";
export const IMAGE_SOURCE_KEY = "imageSource";
export const DEFAULT_PREFERENCES = Object.freeze({
  imageFrequency: "newtab",
  imageResolution: "standard",
  imageSource: "unsplash",
});

export async function getImageSourceId(): Promise<string> {
  const values = await getSync<Record<string, unknown>>(IMAGE_SOURCE_KEY);
  const sourceId = values[IMAGE_SOURCE_KEY];

  if (sourceId === "official") return "unsplash";
  if (typeof sourceId === "string" && sourceId) return sourceId;

  return DEFAULT_PREFERENCES.imageSource;
}

export async function getImageResolution(): Promise<ImageResolution> {
  const values = await getSync<Record<string, unknown>>(IMAGE_RESOLUTION_KEY);
  const resolution = values[IMAGE_RESOLUTION_KEY];

  if (resolution === "high" || resolution === "max") return resolution;

  return "standard";
}

export async function setDefaultExtensionSettings(): Promise<void> {
  const existing = await getSync<Record<string, unknown>>(
    Object.keys(DEFAULT_PREFERENCES),
  );
  const missing = Object.fromEntries(
    Object.entries(DEFAULT_PREFERENCES).filter(
      ([key]) => existing[key] === undefined,
    ),
  );

  if (Object.keys(missing).length) await setSync(missing);
}
