import { getImageSourceId } from "./settings";
import { localSource } from "./sources/local";
import { unsplashSource } from "./sources/unsplash";

import type { ImageSource } from "./types";

const bundledImageSources: readonly ImageSource[] = [
  unsplashSource,
  localSource,
];
const imageSources: ReadonlyMap<string, ImageSource> = new Map(
  bundledImageSources.map((source) => [source.id, source] as const),
);
const defaultImageSource = unsplashSource;

export function listImageSources(): readonly ImageSource[] {
  return bundledImageSources;
}

export function getImageSource(sourceId: string): ImageSource | null {
  return imageSources.get(sourceId) ?? null;
}

export async function initializeImageSourceSettings(): Promise<void> {
  await Promise.all(
    bundledImageSources.map((source) => source.initializeSettings?.()),
  );
}

export async function getActiveImageSource(): Promise<ImageSource> {
  const sourceId = await getImageSourceId();

  return getImageSource(sourceId) ?? defaultImageSource;
}
