import type { BackgroundAsset } from "../assets";

type PhotoFrequency = "newtab" | "every15minutes" | "everyhour" | "everyday";

interface FrequencyOption {
  value: PhotoFrequency;
  label: string;
  description: string;
}

const DEFAULT_PHOTO_FREQUENCY: PhotoFrequency = "newtab";

const FREQUENCIES: readonly FrequencyOption[] = [
  {
    value: "newtab",
    label: "Every new tab",
    description: "Load a new photo whenever you open a tab",
  },
  {
    value: "every15minutes",
    label: "Every 15 minutes",
    description: "Keep the same photo for 15 minutes",
  },
  {
    value: "everyhour",
    label: "Every hour",
    description: "Keep the same photo for 1 hour",
  },
  {
    value: "everyday",
    label: "Every 24 hours",
    description: "Keep the same photo for 24 hours",
  },
];

function isPhotoFrequency(value: unknown): value is PhotoFrequency {
  return FREQUENCIES.some((frequency) => frequency.value === value);
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

export type { FrequencyOption, PhotoFrequency };
export {
  DEFAULT_PHOTO_FREQUENCY,
  FREQUENCIES,
  isPhotoFrequency,
  shouldRotateAtFrequency,
};
