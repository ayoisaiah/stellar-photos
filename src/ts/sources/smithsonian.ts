import type { BackgroundAsset, UncachedBackgroundAsset } from "../assets";
import { readBoundedImage } from "../cache";
import { fetchWithTimeout } from "../requests";
import type { ImageSource } from "../sources";
import {
  getStoredPhotoFrequency,
  shouldRotateAtFrequency,
} from "./photo-frequency";

type SmithsonianCategory =
  | "all"
  | "art_design"
  | "history_culture"
  | "science_technology";

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

const SMITHSONIAN_SETTINGS_KEY = "sourceSettings:smithsonian";
const SMITHSONIAN_CATEGORY_KEY = "sourceSettings:smithsonian:category";
const API_ORIGIN = "https://api.si.edu";
const IMAGE_ORIGIN = "https://ids.si.edu";
const OPEN_ACCESS_URL = "https://www.si.edu/openaccess";

const smithsonianSource: ImageSource = {
  id: "smithsonian",
  name: "Smithsonian Open Access",
  supportsDownload: true,
  shouldRotate: shouldRotateSmithsonian,
  getRandomAsset: getRandomSmithsonianAsset,
  downloadAsset: downloadSmithsonianAsset,
  downloadFullAsset: downloadSmithsonianAsset,
};

function trustedUrl(value: string, origin: string): URL {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.origin !== origin
  ) {
    throw new Error("Smithsonian returned an untrusted URL");
  }

  return url;
}

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

function dimension(value: number | string | undefined, fallback = 0): number {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function isSmithsonianCategory(value: unknown): value is SmithsonianCategory {
  return (
    value === "all" ||
    value === "art_design" ||
    value === "history_culture" ||
    value === "science_technology"
  );
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

async function shouldRotateSmithsonian(
  current: BackgroundAsset,
): Promise<boolean> {
  return shouldRotateAtFrequency(current, smithsonianSource.id, () =>
    getStoredPhotoFrequency(SMITHSONIAN_SETTINGS_KEY),
  );
}

async function getRandomSmithsonianAsset(): Promise<UncachedBackgroundAsset> {
  const category = await getSmithsonianCategory();
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
  trustedUrl(response.url || url.toString(), API_ORIGIN);
  if (!response.ok) {
    throw new Error(`Smithsonian request failed (${response.status})`);
  }

  const data = (await response.json()) as SmithsonianResponse;
  for (const row of data.response?.rows ?? []) {
    const details = row.content?.descriptiveNonRepeating;
    const media = details?.online_media?.media?.find(
      (item) =>
        item.type === "Images" && item.usage?.access === "CC0" && item.content,
    );
    if (!row.id || !media?.content) continue;

    let imageUrl: string;
    try {
      imageUrl = trustedUrl(media.content, IMAGE_ORIGIN).toString();
    } catch {
      continue;
    }
    const sourceUrl = recordUrl(details?.record_link ?? row.url);
    const resource = media.resources?.find(
      (item) => dimension(item.width) > 0 && dimension(item.height) > 0,
    );

    return {
      sourceId: smithsonianSource.id,
      sourceAssetId: row.id,
      width: dimension(resource?.width ?? media.width, DEFAULT_WIDTH),
      height: dimension(resource?.height ?? media.height, DEFAULT_HEIGHT),
      color: null,
      description: row.title ?? null,
      attribution: {
        name: "Smithsonian Open Access",
        url: OPEN_ACCESS_URL,
        sourceUrl,
      },
      payloadVersion: 1,
      sourcePayload: { imageUrl } satisfies SmithsonianPayload,
      createdAt: Date.now(),
    };
  }

  throw new Error("Smithsonian returned no usable images");
}

async function downloadSmithsonianAsset(
  asset: UncachedBackgroundAsset,
): Promise<Response> {
  if (asset.sourceId !== smithsonianSource.id || asset.payloadVersion !== 1) {
    throw new Error("Unsupported Smithsonian asset payload");
  }

  const payload = asset.sourcePayload as Partial<SmithsonianPayload>;
  if (typeof payload.imageUrl !== "string") {
    throw new Error("Malformed Smithsonian asset payload");
  }

  const imageUrl = trustedUrl(payload.imageUrl, IMAGE_ORIGIN);
  const response = await fetchWithTimeout(imageUrl, { redirect: "follow" });
  trustedUrl(response.url || imageUrl.toString(), IMAGE_ORIGIN);

  return readBoundedImage(response);
}

export type { SmithsonianCategory };
export {
  getSmithsonianCategory,
  SMITHSONIAN_SETTINGS_KEY,
  setSmithsonianCategory,
  smithsonianSource,
};
