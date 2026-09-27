import type { PhotoFrequency } from "./sources/photo-frequency";
import { FREQUENCIES } from "./sources/photo-frequency";
import { defineStore, oneOf } from "./store";

interface CoreSettings {
  version: 1;
  activeSourceIds: string[];
  photoFrequency: PhotoFrequency;
}

type PhotoDisplayMode = (typeof DISPLAY_MODE_OPTIONS)[number]["value"];

interface DisplaySettings {
  version: 1;
  landscapeMode: PhotoDisplayMode;
  portraitMode: PhotoDisplayMode;
  motion: boolean;
}

const DISPLAY_MODE_OPTIONS = [
  {
    value: "cover",
    label: "Cover",
    description: "Fills screen (centered, cropped edges)",
  },
  {
    value: "contain-blur",
    label: "Contain with blur",
    description: "Shows full photo with blurred background",
  },
] as const;

const DEFAULT_CORE_SETTINGS: Readonly<CoreSettings> = {
  version: 1,
  activeSourceIds: ["unsplash"],
  photoFrequency: "newtab",
};

const DEFAULT_DISPLAY_SETTINGS: Readonly<DisplaySettings> = {
  version: 1,
  landscapeMode: "cover",
  portraitMode: "contain-blur",
  motion: false,
};

const isPhotoDisplayMode = oneOf(
  DISPLAY_MODE_OPTIONS.map((option) => option.value),
);

const coreStore = defineStore(
  "sync",
  "coreSettings",
  DEFAULT_CORE_SETTINGS,
  {
    version: (v): v is 1 => v === 1,
    activeSourceIds: (v): v is string[] =>
      Array.isArray(v) &&
      v.length > 0 &&
      v.every((id) => typeof id === "string" && Boolean(id)),
    photoFrequency: oneOf(FREQUENCIES.map((f) => f.value)),
  },
  "core settings",
);

const displayStore = defineStore(
  "sync",
  "displaySettings",
  DEFAULT_DISPLAY_SETTINGS,
  {
    version: (v): v is 1 => v === 1,
    landscapeMode: isPhotoDisplayMode,
    portraitMode: isPhotoDisplayMode,
    motion: (v): v is boolean => typeof v === "boolean",
  },
  "display settings",
);

const CORE_SETTINGS_KEY = coreStore.key;
const DISPLAY_SETTINGS_KEY = displayStore.key;

const getCoreSettings = coreStore.get;
const setCoreSettings = coreStore.set;
const parseCoreSettings = coreStore.parse;

const getDisplaySettings = displayStore.get;
const setDisplaySettings = displayStore.set;
const parseDisplaySettings = displayStore.parse;

async function getActiveImageSourceIds(): Promise<string[]> {
  const settings = await getCoreSettings();

  return settings.activeSourceIds;
}

async function setActiveImageSourceIds(sourceIds: string[]): Promise<void> {
  await setCoreSettings({ activeSourceIds: sourceIds });
}

async function getPhotoFrequency(): Promise<PhotoFrequency> {
  const settings = await getCoreSettings();

  return settings.photoFrequency;
}

async function setPhotoFrequency(frequency: PhotoFrequency): Promise<void> {
  await setCoreSettings({ photoFrequency: frequency });
}

export type { CoreSettings, DisplaySettings, PhotoDisplayMode };
export {
  CORE_SETTINGS_KEY,
  coreStore,
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_MODE_OPTIONS,
  DISPLAY_SETTINGS_KEY,
  displayStore,
  getActiveImageSourceIds,
  getCoreSettings,
  getDisplaySettings,
  getPhotoFrequency,
  parseCoreSettings,
  parseDisplaySettings,
  setActiveImageSourceIds,
  setCoreSettings,
  setDisplaySettings,
  setPhotoFrequency,
};
