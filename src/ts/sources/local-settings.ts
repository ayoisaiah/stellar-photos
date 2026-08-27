import type { PhotoFrequency } from "./unsplash-settings";

export interface LocalSettings {
  version: 1;
  photoFrequency: PhotoFrequency;
  folderName: string;
}

export const LOCAL_SETTINGS_KEY = "sourceSettings:local";

export const DEFAULT_LOCAL_SETTINGS: Readonly<LocalSettings> = Object.freeze({
  version: 1,
  photoFrequency: "newtab",
  folderName: "",
});

export async function getLocalSettings(): Promise<LocalSettings> {
  const values = await chrome.storage.sync.get(LOCAL_SETTINGS_KEY);
  const settings = parseLocalSettings(values[LOCAL_SETTINGS_KEY]);

  return settings ?? DEFAULT_LOCAL_SETTINGS;
}

export async function setLocalSettings(
  partial: Partial<Omit<LocalSettings, "version">>,
): Promise<void> {
  const current = await getLocalSettings();

  await chrome.storage.sync.set({
    [LOCAL_SETTINGS_KEY]: {
      ...current,
      ...partial,
      version: 1,
    } satisfies LocalSettings,
  });
}

export async function getLocalPhotoFrequency(): Promise<PhotoFrequency> {
  const settings = await getLocalSettings();

  return settings.photoFrequency;
}

export async function setLocalPhotoFrequency(
  photoFrequency: PhotoFrequency,
): Promise<void> {
  await setLocalSettings({ photoFrequency });
}

export async function initializeLocalSettings(): Promise<void> {
  const syncValues = await chrome.storage.sync.get(LOCAL_SETTINGS_KEY);
  const current = parseLocalSettings(syncValues[LOCAL_SETTINGS_KEY]);

  if (!current) {
    await chrome.storage.sync.set({
      [LOCAL_SETTINGS_KEY]: DEFAULT_LOCAL_SETTINGS,
    });
  }
}

function parseLocalSettings(value: unknown): LocalSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<LocalSettings>;

  if (typeof settings.version === "number" && settings.version > 1) {
    throw new Error(
      `Unsupported Local source settings version: ${settings.version}`,
    );
  }

  if (settings.version !== 1) return null;

  const photoFrequency = isPhotoFrequency(settings.photoFrequency)
    ? settings.photoFrequency
    : DEFAULT_LOCAL_SETTINGS.photoFrequency;

  const folderName =
    typeof settings.folderName === "string"
      ? settings.folderName
      : DEFAULT_LOCAL_SETTINGS.folderName;

  return {
    version: 1,
    photoFrequency,
    folderName,
  };
}

function isPhotoFrequency(value: unknown): value is PhotoFrequency {
  return (
    value === "newtab" ||
    value === "every15minutes" ||
    value === "everyhour" ||
    value === "everyday"
  );
}
