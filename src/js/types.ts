export const HISTORY_VERSION = 1 as const;
export const HISTORY_LIMIT = 10;
export type ImageResolution = "standard" | "high" | "max";

export interface PhotoMetadata {
  id: string;
  cacheKey: string;
  width: number;
  height: number;
  color: string | null;
  description: string | null;
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
  downloadLocation: string;
  createdAt: number;
}

export type UncachedPhotoMetadata = Omit<PhotoMetadata, "cacheKey">;

export interface HistoryState {
  version: typeof HISTORY_VERSION;
  currentId: string | null;
  history: PhotoMetadata[];
}

export type WorkerCommand =
  | { command: "ensure-current" }
  | { command: "rotate" };

export type WorkerResult =
  | { ok: true; current: PhotoMetadata | null }
  | { ok: false; error: { code: string; message: string } };

export interface UnsplashPhotoResponse {
  id: string;
  width: number;
  height: number;
  color: string | null;
  description: string | null;
  alt_description: string | null;
  urls: { raw: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}
