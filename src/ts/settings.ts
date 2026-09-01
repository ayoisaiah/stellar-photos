import type { PhotoFrequency } from "./sources/photo-frequency";
import {
  DEFAULT_PHOTO_FREQUENCY,
  isPhotoFrequency,
} from "./sources/photo-frequency";

interface CoreSettings {
  version: 1;
  activeSourceIds: string[];
  photoFrequency: PhotoFrequency;
}

type PhotoDisplayMode = "cover" | "contain-blur";

interface DisplaySettings {
  version: 1;
  landscapeMode: PhotoDisplayMode;
  portraitMode: PhotoDisplayMode;
  motion: boolean;
}

const CORE_SETTINGS_KEY = "coreSettings";
const DEFAULT_CORE_SETTINGS: Readonly<CoreSettings> = {
  version: 1,
  activeSourceIds: ["unsplash"],
  photoFrequency: DEFAULT_PHOTO_FREQUENCY,
};

const DISPLAY_SETTINGS_KEY = "displaySettings";
const DEFAULT_DISPLAY_SETTINGS: Readonly<DisplaySettings> = {
  version: 1,
  landscapeMode: "cover",
  portraitMode: "contain-blur",
  motion: false,
};

let coreSettingsQueue: Promise<void> = Promise.resolve();
let displaySettingsQueue: Promise<void> = Promise.resolve();

async function getCoreSettings(): Promise<CoreSettings> {
  const values = await chrome.storage.sync.get(CORE_SETTINGS_KEY);
  const settings = parseCoreSettings(values[CORE_SETTINGS_KEY]);

  return settings ?? DEFAULT_CORE_SETTINGS;
}

async function setCoreSettings(
  partial: Partial<Omit<CoreSettings, "version">>,
): Promise<void> {
  const op = async () => {
    const current = await getCoreSettings();

    let activeSourceIds = partial.activeSourceIds ?? current.activeSourceIds;
    if (!Array.isArray(activeSourceIds) || activeSourceIds.length === 0) {
      activeSourceIds = [...DEFAULT_CORE_SETTINGS.activeSourceIds];
    }

    const photoFrequency = partial.photoFrequency ?? current.photoFrequency;

    await chrome.storage.sync.set({
      [CORE_SETTINGS_KEY]: {
        version: 1,
        activeSourceIds,
        photoFrequency,
      } satisfies CoreSettings,
    });
  };

  const next = coreSettingsQueue.then(op, op);
  coreSettingsQueue = next.then(
    () => undefined,
    () => undefined,
  );

  return next;
}

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

async function migrateCoreSettings(): Promise<void> {
  const values = await chrome.storage.sync.get(CORE_SETTINGS_KEY);
  const raw = values[CORE_SETTINGS_KEY];

  if (!raw || typeof raw !== "object") return;

  const rawObj = raw as {
    activeSourceId?: unknown;
    activeSourceIds?: unknown;
    photoFrequency?: unknown;
  };

  if (Array.isArray(rawObj.activeSourceIds)) return;

  let sourceId =
    typeof rawObj.activeSourceId === "string"
      ? rawObj.activeSourceId
      : "unsplash";
  if (sourceId === "official") sourceId = "unsplash";

  let frequency: PhotoFrequency = DEFAULT_PHOTO_FREQUENCY;
  if (isPhotoFrequency(rawObj.photoFrequency)) {
    frequency = rawObj.photoFrequency;
  }

  await chrome.storage.sync.set({
    [CORE_SETTINGS_KEY]: {
      version: 1,
      activeSourceIds: [sourceId],
      photoFrequency: frequency,
    } satisfies CoreSettings,
  });
}

async function getDisplaySettings(): Promise<DisplaySettings> {
  const values = await chrome.storage.sync.get(DISPLAY_SETTINGS_KEY);
  const settings = parseDisplaySettings(values[DISPLAY_SETTINGS_KEY]);

  return settings ?? DEFAULT_DISPLAY_SETTINGS;
}

async function setDisplaySettings(
  partial: Partial<Omit<DisplaySettings, "version">>,
): Promise<void> {
  const op = async () => {
    const current = await getDisplaySettings();

    await chrome.storage.sync.set({
      [DISPLAY_SETTINGS_KEY]: {
        ...current,
        ...partial,
        version: 1,
      } satisfies DisplaySettings,
    });
  };

  const next = displaySettingsQueue.then(op, op);
  displaySettingsQueue = next.then(
    () => undefined,
    () => undefined,
  );

  return next;
}

function parseCoreSettings(value: unknown): CoreSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<CoreSettings & { activeSourceId?: string }>;

  if (typeof settings.version === "number" && settings.version > 1) {
    throw new Error(`Unsupported core settings version: ${settings.version}`);
  }

  let activeSourceIds: string[];
  if (
    Array.isArray(settings.activeSourceIds) &&
    settings.activeSourceIds.length > 0
  ) {
    activeSourceIds = settings.activeSourceIds.filter(
      (id): id is string => typeof id === "string" && Boolean(id),
    );
  } else if (
    typeof settings.activeSourceId === "string" &&
    settings.activeSourceId
  ) {
    const id =
      settings.activeSourceId === "official"
        ? "unsplash"
        : settings.activeSourceId;
    activeSourceIds = [id];
  } else {
    activeSourceIds = [...DEFAULT_CORE_SETTINGS.activeSourceIds];
  }

  if (activeSourceIds.length === 0) {
    activeSourceIds = [...DEFAULT_CORE_SETTINGS.activeSourceIds];
  }

  const photoFrequency = isPhotoFrequency(settings.photoFrequency)
    ? settings.photoFrequency
    : DEFAULT_CORE_SETTINGS.photoFrequency;

  return {
    version: 1,
    activeSourceIds,
    photoFrequency,
  };
}

function parseDisplaySettings(value: unknown): DisplaySettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<DisplaySettings>;

  if (typeof settings.version === "number" && settings.version > 1) {
    throw new Error(
      `Unsupported display settings version: ${settings.version}`,
    );
  }

  if (settings.version !== 1) return null;

  const landscapeMode = isPhotoDisplayMode(settings.landscapeMode)
    ? settings.landscapeMode
    : DEFAULT_DISPLAY_SETTINGS.landscapeMode;

  const portraitMode = isPhotoDisplayMode(settings.portraitMode)
    ? settings.portraitMode
    : DEFAULT_DISPLAY_SETTINGS.portraitMode;

  const motion =
    typeof settings.motion === "boolean"
      ? settings.motion
      : DEFAULT_DISPLAY_SETTINGS.motion;

  return {
    version: 1,
    landscapeMode,
    portraitMode,
    motion,
  };
}

function isPhotoDisplayMode(value: unknown): value is PhotoDisplayMode {
  return value === "cover" || value === "contain-blur";
}

export type { CoreSettings, DisplaySettings, PhotoDisplayMode };
export {
  CORE_SETTINGS_KEY,
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_KEY,
  getActiveImageSourceIds,
  getCoreSettings,
  getDisplaySettings,
  getPhotoFrequency,
  migrateCoreSettings,
  parseCoreSettings,
  parseDisplaySettings,
  setActiveImageSourceIds,
  setCoreSettings,
  setDisplaySettings,
  setPhotoFrequency,
};
