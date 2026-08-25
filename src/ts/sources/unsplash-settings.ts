import { getLocal } from "../storage";

declare const __UNSPLASH_ACCESS_KEY__: string;

const ACCESS_KEY_OVERRIDE_KEY = "unsplashAccessKey";

export const STELLAR_COLLECTION = "998309";

export async function resolveAccessKey(): Promise<string> {
  const values = await getLocal<Record<string, unknown>>(
    ACCESS_KEY_OVERRIDE_KEY,
  );
  const override = values[ACCESS_KEY_OVERRIDE_KEY];

  if (typeof override === "string" && override.trim()) return override.trim();
  if (__UNSPLASH_ACCESS_KEY__.trim()) return __UNSPLASH_ACCESS_KEY__.trim();

  throw new Error("No Unsplash access key is configured");
}
