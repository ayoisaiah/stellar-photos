interface LocalSettings {
  version: 1;
  folderName: string;
}

const LOCAL_SETTINGS_KEY = "sourceSettings:local";

const DEFAULT_LOCAL_SETTINGS: Readonly<LocalSettings> = {
  version: 1,
  folderName: "",
};

async function getLocalSettings(): Promise<LocalSettings> {
  const values = await chrome.storage.sync.get(LOCAL_SETTINGS_KEY);
  const settings = parseLocalSettings(values[LOCAL_SETTINGS_KEY]);

  return settings ?? DEFAULT_LOCAL_SETTINGS;
}

async function setLocalSettings(
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

function parseLocalSettings(value: unknown): LocalSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<LocalSettings>;

  if (typeof settings.version === "number" && settings.version > 1) {
    throw new Error(
      `Unsupported Local source settings version: ${settings.version}`,
    );
  }

  if (settings.version !== 1) return null;

  const folderName =
    typeof settings.folderName === "string"
      ? settings.folderName
      : DEFAULT_LOCAL_SETTINGS.folderName;

  return {
    version: 1,
    folderName,
  };
}

export type { LocalSettings };
export {
  DEFAULT_LOCAL_SETTINGS,
  getLocalSettings,
  LOCAL_SETTINGS_KEY,
  setLocalSettings,
};
