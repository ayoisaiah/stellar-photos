type PhotoFrequency = "newtab" | "every15minutes" | "everyhour" | "everyday";

function isPhotoFrequency(value: unknown): value is PhotoFrequency {
  return (
    value === "newtab" ||
    value === "every15minutes" ||
    value === "everyhour" ||
    value === "everyday"
  );
}

export type { PhotoFrequency };
export { isPhotoFrequency };
