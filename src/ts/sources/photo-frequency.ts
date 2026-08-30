import type { BackgroundAsset } from "../assets";

type PhotoFrequency = "newtab" | "every15minutes" | "everyhour" | "everyday";

const DEFAULT_PHOTO_FREQUENCY: PhotoFrequency = "newtab";

function isPhotoFrequency(value: unknown): value is PhotoFrequency {
  return (
    value === "newtab" ||
    value === "every15minutes" ||
    value === "everyhour" ||
    value === "everyday"
  );
}

async function shouldRotateAtFrequency(
  current: BackgroundAsset,
  sourceId: string,
  getFrequency: () => Promise<PhotoFrequency>,
): Promise<boolean> {
  if (current.sourceId !== sourceId) return true;

  const elapsed = Date.now() - current.createdAt;

  switch (await getFrequency()) {
    case "every15minutes":
      return elapsed >= 15 * 60 * 1000;
    case "everyhour":
      return elapsed >= 60 * 60 * 1000;
    case "everyday":
      return elapsed >= 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

async function getStoredPhotoFrequency(key: string): Promise<PhotoFrequency> {
  const values = await chrome.storage.sync.get(key);
  const settings = values[key] as
    | { photoFrequency?: unknown; version?: unknown }
    | undefined;

  if (typeof settings?.version === "number" && settings.version > 1) {
    throw new Error(`Unsupported source settings version: ${settings.version}`);
  }

  return isPhotoFrequency(settings?.photoFrequency)
    ? settings.photoFrequency
    : DEFAULT_PHOTO_FREQUENCY;
}

async function setStoredPhotoFrequency(
  key: string,
  photoFrequency: PhotoFrequency,
): Promise<void> {
  await chrome.storage.sync.set({
    [key]: { version: 1, photoFrequency },
  });
}

export type { PhotoFrequency };
export {
  getStoredPhotoFrequency,
  isPhotoFrequency,
  setStoredPhotoFrequency,
  shouldRotateAtFrequency,
};
