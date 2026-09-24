import type { LucideIconData } from "@lucide/icons";
import type { BackgroundAsset, UncachedBackgroundAsset } from "./assets";
import { getActiveImageSourceIds } from "./settings";
import { earthviewSource } from "./sources/earthview";
import { localSource } from "./sources/local";
import { smithsonianSource } from "./sources/smithsonian";
import { unsplashSource } from "./sources/unsplash";

interface PhotoCredit {
  name: string;
  url: string;
  avatar?: string | null;
  icon?: LucideIconData;
  sourceUrl: string;
  sourceName: string;
}

interface ImageSource {
  readonly id: string;
  readonly name: string;
  readonly supportsDownload?: boolean;
  readonly supportsInfo?: boolean;
  getCredit?(asset: BackgroundAsset): PhotoCredit | null;
  isSupported?(): boolean;
  getRandomAsset(): Promise<UncachedBackgroundAsset>;
  downloadAsset(asset: UncachedBackgroundAsset): Promise<Response>;
  downloadFullAsset?(asset: BackgroundAsset): Promise<Response>;
  didDownload?(asset: BackgroundAsset): Promise<void>;
}

const bundledImageSources: readonly ImageSource[] = [
  unsplashSource,
  earthviewSource,
  smithsonianSource,
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

async function getActiveImageSources(): Promise<ImageSource[]> {
  const activeIds = await getActiveImageSourceIds();
  const sources = activeIds
    .map((id) => getImageSource(id))
    .filter((source): source is ImageSource => Boolean(source));

  return sources.length > 0 ? sources : [defaultImageSource];
}

export {
  getActiveImageSources,
  getImageSource,
  type ImageSource,
  listImageSources,
};
