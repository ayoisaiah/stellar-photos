import type { BackgroundAsset, UncachedBackgroundAsset } from "./assets";
import { getImageSourceId } from "./settings";
import { earthviewSource } from "./sources/earthview";
import { localSource } from "./sources/local";
import { unsplashSource } from "./sources/unsplash";

interface ImageSource {
  readonly id: string;
  readonly name: string;
  readonly supportsDownload?: boolean;
  readonly supportsInfo?: boolean;
  initializeSettings?(): Promise<void>;
  shouldRotate?(current: BackgroundAsset): Promise<boolean>;
  getRandomAsset(): Promise<UncachedBackgroundAsset>;
  downloadAsset(asset: UncachedBackgroundAsset): Promise<Response>;
  downloadFullAsset?(asset: BackgroundAsset): Promise<Response>;
  didDownload?(asset: BackgroundAsset): Promise<void>;
}

const bundledImageSources: readonly ImageSource[] = [
  unsplashSource,
  earthviewSource,
  localSource,
];
const imageSources: ReadonlyMap<string, ImageSource> = new Map(
  bundledImageSources.map((source) => [source.id, source] as const),
);
const defaultImageSource = unsplashSource;

function listImageSources(): readonly ImageSource[] {
  return bundledImageSources;
}

function getImageSource(sourceId: string): ImageSource | null {
  return imageSources.get(sourceId) ?? null;
}

async function initializeImageSourceSettings(): Promise<void> {
  await Promise.all(
    bundledImageSources.map((source) => source.initializeSettings?.()),
  );
}

async function getActiveImageSource(): Promise<ImageSource> {
  const sourceId = await getImageSourceId();

  return getImageSource(sourceId) ?? defaultImageSource;
}

export type { ImageSource };
export {
  getActiveImageSource,
  getImageSource,
  initializeImageSourceSettings,
  listImageSources,
};
