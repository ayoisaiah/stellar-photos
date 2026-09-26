type SourceHealthMap = Record<string, string>;

const SOURCE_HEALTH_STORAGE_KEY = "sourceHealth";

function parseSourceHealth(value: unknown): SourceHealthMap {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].length > 0,
    ),
  );
}

async function getSourceHealthMap(): Promise<SourceHealthMap> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return {};

  const values = await chrome.storage.local.get(SOURCE_HEALTH_STORAGE_KEY);
  return parseSourceHealth(values[SOURCE_HEALTH_STORAGE_KEY]);
}

async function setSourceError(
  sourceId: string,
  message: string,
): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;

  const errors = await getSourceHealthMap();
  if (message) {
    errors[sourceId] = message;
  } else {
    delete errors[sourceId];
  }

  await chrome.storage.local.set({ [SOURCE_HEALTH_STORAGE_KEY]: errors });
}

export {
  getSourceHealthMap,
  parseSourceHealth,
  SOURCE_HEALTH_STORAGE_KEY,
  type SourceHealthMap,
  setSourceError,
};
