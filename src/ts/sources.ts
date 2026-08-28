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
  isSupported?(): boolean;
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

function isSourceSupported(source: ImageSource): boolean {
  return source.isSupported ? source.isSupported() : true;
}

function listImageSources(): readonly ImageSource[] {
  return bundledImageSources.filter(isSourceSupported);
}

function getImageSource(sourceId: string): ImageSource | null {
  const source = imageSources.get(sourceId);
  if (!source || !isSourceSupported(source)) return null;

  return source;
}

async function getActiveImageSource(): Promise<ImageSource> {
  const sourceId = await getImageSourceId();

  return getImageSource(sourceId) ?? defaultImageSource;
}

export type { ImageSource };
export { getActiveImageSource, getImageSource, listImageSources };
