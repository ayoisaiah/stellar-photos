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
  | { command: "rotate" }
  | { command: "prepare-source"; sourceId: string }
  | { command: "commit-source"; asset: BackgroundAsset }
  | { command: "discard-source"; asset: BackgroundAsset }
  | { command: "track-download"; asset: BackgroundAsset };

export type WorkerResult =
  | { ok: true; current: BackgroundAsset | null }
  | { ok: false; error: { code: string; message: string } };

export interface ImageSource {
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

export const HISTORY_VERSION = 2 as const;
export const HISTORY_LIMIT = 10;
