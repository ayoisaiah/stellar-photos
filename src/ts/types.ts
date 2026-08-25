export type ImageResolution = "standard" | "high" | "max";

export interface Attribution {
  name: string;
  url: string;
  sourceUrl: string;
}

export interface BackgroundAsset {
  sourceId: string;
  sourceAssetId: string;
  cacheKey: string;
  width: number;
  height: number;
  color: string | null;
  description: string | null;
  attribution: Attribution | null;
  payloadVersion: number;
  sourcePayload: unknown;
  createdAt: number;
}

export type UncachedBackgroundAsset = Omit<BackgroundAsset, "cacheKey">;

export interface HistoryState {
  version: typeof HISTORY_VERSION;
  history: BackgroundAsset[];
}

export type WorkerCommand =
  | { command: "ensure-current" }
  | { command: "rotate" };

export type WorkerResult =
  | { ok: true; current: BackgroundAsset | null }
  | { ok: false; error: { code: string; message: string } };

export interface ImageSource {
  readonly id: string;
  getRandomAsset(): Promise<UncachedBackgroundAsset>;
  downloadAsset(asset: UncachedBackgroundAsset): Promise<Response>;
  didDownload?(asset: BackgroundAsset): Promise<void>;
}

export const HISTORY_VERSION = 2 as const;
export const HISTORY_LIMIT = 10;
