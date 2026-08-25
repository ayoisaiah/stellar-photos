import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { loadEnv } from "vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifestVersion: 3,
  outDir: "dist",
  outDirTemplate: "{{browser}}",
  publicDir: "src/icons",
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  manifest: ({ browser }) => ({
    name: "Stellar Photos",
    version: "5.0.0",
    description:
      "Experience a beautiful photo from Unsplash every time you open a new browser tab",
    icons: {
      48: "48.png",
      64: "64.png",
      128: "128.png",
    },
    permissions: ["storage", "unlimitedStorage"],
    host_permissions: [
      "https://api.unsplash.com/*",
      "https://images.unsplash.com/*",
    ],
    minimum_chrome_version: browser === "chrome" ? "150" : undefined,
    browser_specific_settings:
      browser === "firefox"
        ? {
            gecko: {
              id: "stellar-photos@freshman.tech",
              strict_min_version: "153.0",
            },
          }
        : undefined,
  }),
  vite: ({ browser, mode }) => {
    const accessKey = process.env.STELLAR_ENV_FILE
      ? (readEnvironmentFile(process.env.STELLAR_ENV_FILE)
          .UNSPLASH_ACCESS_KEY ?? "")
      : (process.env.UNSPLASH_ACCESS_KEY ??
        loadEnv(mode, process.cwd(), "").UNSPLASH_ACCESS_KEY ??
        "");
    const normalizedAccessKey = accessKey.trim();

    if (mode === "production" && !normalizedAccessKey) {
      throw new Error("UNSPLASH_ACCESS_KEY is required for a production build");
    }

    return {
      build: {
        sourcemap: mode === "development" ? "inline" : false,
        target: browser === "chrome" ? "chrome150" : "firefox153",
      },
      css: {
        devSourcemap: mode === "development",
      },
      define: {
        __UNSPLASH_ACCESS_KEY__: JSON.stringify(
          normalizedAccessKey || "development-key",
        ),
      },
    };
  },
});

function readEnvironmentFile(path: string): Record<string, string | undefined> {
  try {
    return parseEnv(readFileSync(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};

    throw error;
  }
}
