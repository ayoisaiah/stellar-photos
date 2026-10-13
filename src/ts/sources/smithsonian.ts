import {
  type BackgroundAsset,
  makeAsset,
  type UncachedBackgroundAsset,
} from "../assets";
import { readBoundedImage } from "../cache";
import { fetchWithTimeout } from "../requests";
import type { ImageSource } from "../sources";
import { oneOf } from "../store";

type SmithsonianCategory = (typeof SMITHSONIAN_CATEGORIES)[number];

interface SmithsonianQueueState {
  category: SmithsonianCategory;
  items: UncachedBackgroundAsset[];
}

interface SmithsonianResource {
  height?: number | string;
  width?: number | string;
}

interface SmithsonianMedia {
  content?: string;
  height?: number | string;
  resources?: SmithsonianResource[];
  type?: string;
  usage?: { access?: string };
  width?: number | string;
}

interface SmithsonianRow {
  id?: string;
  title?: string;
  url?: string;
  content?: {
    descriptiveNonRepeating?: {
      record_link?: string;
      online_media?: { media?: SmithsonianMedia[] };
    };
  };
}

interface SmithsonianPayload {
  imageUrl: string;
}

interface SmithsonianResponse {
  response?: { rows?: SmithsonianRow[] };
}

declare const __SMITHSONIAN_API_KEY__: string;

const SMITHSONIAN_CATEGORIES = [
  "art_design",
  "history_culture",
  "science_technology",
  "all",
] as const;

const SMITHSONIAN_CATEGORY_KEY = "sourceSettings:smithsonian:category";
const SMITHSONIAN_QUEUE_KEY = "sourceQueue:smithsonian";
const SMITHSONIAN_CURSOR_KEY = "sourceQueueCursor:smithsonian";
const API_ORIGIN = "https://api.si.edu";
const OPEN_ACCESS_URL = "https://www.si.edu/openaccess";
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const isSmithsonianCategory = oneOf(SMITHSONIAN_CATEGORIES);

const smithsonianSource: ImageSource = {
  id: "smithsonian",
  name: "Smithsonian Open Access",
  description: "High-resolution open access museum collections",
  settingsTag: "stellar-smithsonian-settings",
  getCredit(asset) {
    if (!asset.attribution) return null;

    return { ...asset.attribution, sourceName: smithsonianSource.name };
  },
  fetchRandom,
  getDownloadUrl: getSmithsonianDownloadUrl,
};

function dimension(value: number | string | undefined, fallback = 0): number {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : fallback;
}

async function getSmithsonianCategory(): Promise<SmithsonianCategory> {
  const values = await chrome.storage.sync.get(SMITHSONIAN_CATEGORY_KEY);
  const value = values[SMITHSONIAN_CATEGORY_KEY];

  return isSmithsonianCategory(value) ? value : "art_design";
}

async function setSmithsonianCategory(
  category: SmithsonianCategory,
): Promise<void> {
  await chrome.storage.sync.set({ [SMITHSONIAN_CATEGORY_KEY]: category });
}

function recordUrl(value: string | undefined): string {
  if (!value) return OPEN_ACCESS_URL;

  try {
    const rawUrl = value.startsWith("/")
      ? new URL(value, "https://www.si.edu")
      : new URL(value);

    if (rawUrl.protocol === "http:") {
      rawUrl.protocol = "https:";
    }

    if (
      rawUrl.protocol === "https:" &&
      !rawUrl.username &&
      !rawUrl.password &&
      !rawUrl.port &&
      (rawUrl.hostname === "si.edu" || rawUrl.hostname.endsWith(".si.edu"))
    ) {
      return rawUrl.toString();
    }
  } catch {
    // Use the Open Access page below.
  }

  return OPEN_ACCESS_URL;
}

function extractSmithsonianAssets(
  rows: SmithsonianRow[],
): UncachedBackgroundAsset[] {
  const assets: UncachedBackgroundAsset[] = [];

  for (const row of rows) {
    const details = row.content?.descriptiveNonRepeating;
    const media = details?.online_media?.media?.find(
      (item) =>
        item.type === "Images" && item.usage?.access === "CC0" && item.content,
    );
    if (!row.id || !media?.content) continue;

    const imageUrl = media.content;
    const sourceUrl = recordUrl(details?.record_link ?? row.url);
    const resource = media.resources?.find(
      (item) => dimension(item.width) > 0 && dimension(item.height) > 0,
    );

    assets.push(
      makeAsset({
        sourceId: smithsonianSource.id,
        sourceAssetId: row.id,
        width: dimension(resource?.width ?? media.width, DEFAULT_WIDTH),
        height: dimension(resource?.height ?? media.height, DEFAULT_HEIGHT),
        description: row.title ?? null,
        attribution: {
          name: "Smithsonian Open Access",
          url: OPEN_ACCESS_URL,
          sourceUrl,
        },
        sourcePayload: { imageUrl } satisfies SmithsonianPayload,
      }),
    );
  }

  return assets;
}

async function fetchRandom(): Promise<{
  asset: UncachedBackgroundAsset;
  blob: Blob;
}> {
  const category = await getSmithsonianCategory();
  const stored = await chrome.storage.local.get([
    SMITHSONIAN_QUEUE_KEY,
    SMITHSONIAN_CURSOR_KEY,
  ]);
  const queue = stored[SMITHSONIAN_QUEUE_KEY] as
    | SmithsonianQueueState
    | undefined;

  let items = queue?.category === category ? queue.items : [];
  let cursor = (stored[SMITHSONIAN_CURSOR_KEY] as number | undefined) ?? 0;
  if (items.length === 0 || cursor >= items.length) {
    const path =
      category === "all"
        ? "/openaccess/api/v1.0/search"
        : `/openaccess/api/v1.0/category/${category}/search`;
    const url = new URL(path, API_ORIGIN);
    url.search = new URLSearchParams({
      api_key: __SMITHSONIAN_API_KEY__,
      q: 'online_media_type:"Images" AND media_usage:"CC0"',
      rows: "10",
      sort: "random",
    }).toString();

    const response = await fetchWithTimeout(url, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Smithsonian request failed (${response.status})`);
    }

    const data = (await response.json()) as SmithsonianResponse;
    items = extractSmithsonianAssets(data.response?.rows ?? []);
    if (items.length === 0) {
      throw new Error("Smithsonian returned no usable images");
    }

    cursor = 0;
    await chrome.storage.local.set({
      [SMITHSONIAN_QUEUE_KEY]: { category, items },
      [SMITHSONIAN_CURSOR_KEY]: cursor + 1,
    });
  } else {
    await chrome.storage.local.set({ [SMITHSONIAN_CURSOR_KEY]: cursor + 1 });
  }

  const candidate = items[cursor]!;
  const { imageUrl } = candidate.sourcePayload as SmithsonianPayload;
  const imageResponse = await fetchWithTimeout(new URL(imageUrl), {
    redirect: "follow",
  });

  return {
    asset: { ...candidate, createdAt: Date.now() },
    blob: await readBoundedImage(imageResponse),
  };
}

function getSmithsonianDownloadUrl(asset: UncachedBackgroundAsset): string {
  const payload = asset.sourcePayload as SmithsonianPayload;

  return payload.imageUrl;
}

export {
  getSmithsonianCategory,
  recordUrl,
  SMITHSONIAN_CATEGORIES,
  type SmithsonianCategory,
  setSmithsonianCategory,
  smithsonianSource,
};
