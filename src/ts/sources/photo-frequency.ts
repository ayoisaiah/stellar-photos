import type { BackgroundAsset } from "../assets";

type PhotoFrequency = (typeof FREQUENCIES)[number]["value"];

type FrequencyOption = (typeof FREQUENCIES)[number];

const FREQUENCIES = [
  {
    value: "newtab",
    label: "Every new tab",
    description: "Load a new photo whenever you open a tab",
    ms: 0,
  },
  {
    value: "every15minutes",
    label: "Every 15 minutes",
    description: "Keep the same photo for 15 minutes",
    ms: 15 * 60 * 1000,
  },
  {
    value: "everyhour",
    label: "Every hour",
    description: "Keep the same photo for 1 hour",
    ms: 60 * 60 * 1000,
  },
  {
    value: "everyday",
    label: "Every 24 hours",
    description: "Keep the same photo for 24 hours",
    ms: 24 * 60 * 60 * 1000,
  },
] as const;

function shouldRotateAtFrequency(
  current: BackgroundAsset,
  frequency: PhotoFrequency,
): boolean {
  const option = FREQUENCIES.find((f) => f.value === frequency)!;
  if (option.ms === 0) return true;

  return Date.now() - current.createdAt >= option.ms;
}

export {
  FREQUENCIES,
  type FrequencyOption,
  type PhotoFrequency,
  shouldRotateAtFrequency,
};
