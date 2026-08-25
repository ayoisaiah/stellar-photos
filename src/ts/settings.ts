import { getSync, removeSync, setSync } from "./storage";

export interface CoreSettings {
  version: 1;
  activeSourceId: string;
}

const LEGACY_IMAGE_FREQUENCY_KEY = "imageFrequency";
const LEGACY_IMAGE_SOURCE_KEY = "imageSource";

export const CORE_SETTINGS_KEY = "coreSettings";
export const DEFAULT_CORE_SETTINGS: Readonly<CoreSettings> = Object.freeze({
  version: 1,
  activeSourceId: "unsplash",
});

export async function getImageSourceId(): Promise<string> {
  const values = await getSync<Record<string, unknown>>(CORE_SETTINGS_KEY);
  const settings = parseCoreSettings(values[CORE_SETTINGS_KEY]);
  const sourceId = settings?.activeSourceId;

  if (sourceId === "official") return "unsplash";
  if (typeof sourceId === "string" && sourceId) return sourceId;

  return DEFAULT_CORE_SETTINGS.activeSourceId;
}

export async function setImageSourceId(sourceId: string): Promise<void> {
  const values = await getSync<Record<string, unknown>>(CORE_SETTINGS_KEY);
  const current = parseCoreSettings(values[CORE_SETTINGS_KEY]);

  await setSync({
    [CORE_SETTINGS_KEY]: {
      ...(current ?? DEFAULT_CORE_SETTINGS),
      activeSourceId: sourceId,
    } satisfies CoreSettings,
  });
}

export async function initializeCoreSettings(): Promise<void> {
  const keys = [
    CORE_SETTINGS_KEY,
    LEGACY_IMAGE_SOURCE_KEY,
    LEGACY_IMAGE_FREQUENCY_KEY,
  ];
  const values = await getSync<Record<string, unknown>>(keys);
  const current = parseCoreSettings(values[CORE_SETTINGS_KEY]);

  if (!current) {
    const legacySourceId = values[LEGACY_IMAGE_SOURCE_KEY];
    const activeSourceId =
      legacySourceId === "official"
        ? "unsplash"
        : typeof legacySourceId === "string" && legacySourceId
          ? legacySourceId
          : DEFAULT_CORE_SETTINGS.activeSourceId;

    await setSync({
      [CORE_SETTINGS_KEY]: {
        ...DEFAULT_CORE_SETTINGS,
        activeSourceId,
      } satisfies CoreSettings,
    });
  }

  await removeSync([LEGACY_IMAGE_SOURCE_KEY, LEGACY_IMAGE_FREQUENCY_KEY]);
}

function parseCoreSettings(value: unknown): CoreSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<CoreSettings>;

  if (typeof settings.version === "number" && settings.version > 1)
    throw new Error(`Unsupported core settings version: ${settings.version}`);

  if (
    settings.version !== 1 ||
    typeof settings.activeSourceId !== "string" ||
    !settings.activeSourceId
  )
    return null;

  return settings as CoreSettings;
}
