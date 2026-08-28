import type { BackgroundAsset } from "../assets";

type PhotoFrequency = "newtab" | "every15minutes" | "everyhour" | "everyday";

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

export type { PhotoFrequency };
export { isPhotoFrequency, shouldRotateAtFrequency };
