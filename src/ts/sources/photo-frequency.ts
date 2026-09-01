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

function shouldRotateAtFrequency(
  current: BackgroundAsset,
  frequency: PhotoFrequency,
): boolean {
  const elapsed = Date.now() - current.createdAt;

  switch (frequency) {
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

export type { PhotoFrequency };
export { DEFAULT_PHOTO_FREQUENCY, isPhotoFrequency, shouldRotateAtFrequency };
