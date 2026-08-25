import { getImageSourceId } from "./settings";
import { unsplashSource } from "./sources/unsplash";

import type { ImageSource } from "./types";

const imageSources: ReadonlyMap<string, ImageSource> = new Map(
  [unsplashSource].map((source) => [source.id, source] as const),
);
const defaultImageSource = unsplashSource;

export async function getActiveImageSource(): Promise<ImageSource> {
  const sourceId = await getImageSourceId();

  return imageSources.get(sourceId) ?? defaultImageSource;
}
