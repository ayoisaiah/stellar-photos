import { ACCESS_KEY_OVERRIDE_KEY, getLocal, getSync, setSync } from "./storage";
import type { ImageResolution } from "./types";

declare const __UNSPLASH_ACCESS_KEY__: string;

export const STELLAR_COLLECTION = "998309";
export const IMAGE_RESOLUTION_KEY = "imageResolution";
export const DEFAULT_PREFERENCES = Object.freeze({
  imageFrequency: "newtab",
  imageResolution: "standard",
  imageSource: "official",
});

export async function resolveAccessKey(): Promise<string> {
  const values = await getLocal<Record<string, unknown>>(
    ACCESS_KEY_OVERRIDE_KEY,
  );
  const override = values[ACCESS_KEY_OVERRIDE_KEY];
  if (typeof override === "string" && override.trim()) return override.trim();
  if (__UNSPLASH_ACCESS_KEY__.trim()) return __UNSPLASH_ACCESS_KEY__.trim();
  throw new Error("No Unsplash access key is configured");
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
