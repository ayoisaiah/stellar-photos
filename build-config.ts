import { parseEnv } from "node:util";

type Environment = Record<string, string | undefined>;

export function resolveBuildAccessKey(
  environment: Environment,
  dotenvContent?: string,
): string | undefined {
  const exported = environment.UNSPLASH_ACCESS_KEY?.trim();
  if (exported) return exported;
  const dotenv = dotenvContent ? parseEnv(dotenvContent) : {};
  return dotenv.UNSPLASH_ACCESS_KEY?.trim() || undefined;
}
