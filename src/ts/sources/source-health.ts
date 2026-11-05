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

export { parseSourceHealth, SOURCE_HEALTH_STORAGE_KEY, type SourceHealthMap };
