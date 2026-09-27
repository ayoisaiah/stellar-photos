import { defineStore, oneOf } from "../store";

type ImageResolution = (typeof RESOLUTIONS)[number]["value"];

type PhotoOrientation = Exclude<(typeof ORIENTATIONS)[number]["value"], "">;

type ContentFilter = (typeof CONTENT_FILTERS)[number]["value"];

interface UnsplashSettings {
  version: 1;
  imageQuality: ImageResolution;
  collections: string;
  topics: string;
  username: string;
  query: string;
  orientation: PhotoOrientation | "";
  contentFilter: ContentFilter;
}

interface UnsplashLocalSettings {
  version: 1;
  accessKeyOverride: string;
}

declare const __UNSPLASH_ACCESS_KEY__: string;

const RESOLUTIONS = [
  {
    value: "standard",
    label: "Standard",
    description: "Up to 2000px · faster and lighter",
  },
  {
    value: "high",
    label: "High",
    description: "Up to 4000px · sharper on large displays",
  },
  {
    value: "max",
    label: "Original",
    description: "Full size · uses the most bandwidth",
  },
] as const;

const ORIENTATIONS = [
  { value: "", label: "Any orientation" },
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
  { value: "squarish", label: "Square" },
] as const;

const CONTENT_FILTERS = [
  { value: "low", label: "Standard (low)" },
  { value: "high", label: "Stricter filtering (high)" },
] as const;

const STELLAR_COLLECTION = "998309";
const UNSPLASH_SETTINGS_KEY = "sourceSettings:unsplash";

const DEFAULT_UNSPLASH_SETTINGS: Readonly<UnsplashSettings> = {
  version: 1,
  imageQuality: "standard",
  collections: STELLAR_COLLECTION,
  topics: "",
  username: "",
  query: "",
  orientation: "",
  contentFilter: "low",
};

const DEFAULT_UNSPLASH_LOCAL_SETTINGS: Readonly<UnsplashLocalSettings> = {
  version: 1,
  accessKeyOverride: "",
};

const unsplashSyncStore = defineStore(
  "sync",
  UNSPLASH_SETTINGS_KEY,
  DEFAULT_UNSPLASH_SETTINGS,
  {
    version: (v): v is 1 => v === 1,
    imageQuality: oneOf(RESOLUTIONS.map((option) => option.value)),
    collections: (v): v is string => typeof v === "string",
    topics: (v): v is string => typeof v === "string",
    username: (v): v is string => typeof v === "string",
    query: (v): v is string => typeof v === "string",
    orientation: oneOf(ORIENTATIONS.map((option) => option.value)),
    contentFilter: oneOf(CONTENT_FILTERS.map((option) => option.value)),
  },
  "Unsplash settings",
);

const unsplashLocalStore = defineStore(
  "local",
  UNSPLASH_SETTINGS_KEY,
  DEFAULT_UNSPLASH_LOCAL_SETTINGS,
  {
    version: (v): v is 1 => v === 1,
    accessKeyOverride: (v): v is string => typeof v === "string",
  },
  "local Unsplash settings",
);

const getUnsplashSettings = unsplashSyncStore.get;
const setUnsplashSettings = unsplashSyncStore.set;
const parseUnsplashSettings = unsplashSyncStore.parse;

async function getUnsplashAccessKey(): Promise<string> {
  const settings = await unsplashLocalStore.get();

  return settings.accessKeyOverride;
}

async function setUnsplashAccessKey(accessKey: string): Promise<void> {
  await unsplashLocalStore.set({ accessKeyOverride: accessKey.trim() });
}

class MissingKeyError extends Error {
  constructor(message = "No Unsplash access key is configured") {
    super(message);
    this.name = "MissingKeyError";
  }
}

async function resolveAccessKey(): Promise<string> {
  const override = await getUnsplashAccessKey();

  if (override.trim()) return override.trim();
  if (__UNSPLASH_ACCESS_KEY__.trim()) return __UNSPLASH_ACCESS_KEY__.trim();

  throw new MissingKeyError();
}

export type {
  ContentFilter,
  ImageResolution,
  PhotoOrientation,
  UnsplashSettings,
};
export {
  CONTENT_FILTERS,
  DEFAULT_UNSPLASH_SETTINGS,
  getUnsplashAccessKey,
  getUnsplashSettings,
  MissingKeyError,
  ORIENTATIONS,
  parseUnsplashSettings,
  RESOLUTIONS,
  resolveAccessKey,
  STELLAR_COLLECTION,
  setUnsplashAccessKey,
  setUnsplashSettings,
  UNSPLASH_SETTINGS_KEY,
};
