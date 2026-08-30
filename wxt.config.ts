import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { loadEnv } from "vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifestVersion: 3,
  outDir: process.env.STELLAR_OUT_DIR ?? "dist",
  outDirTemplate: "{{browser}}",
  publicDir: "src/icons",
  manifest: ({ browser }) => ({
    name: "Stellar Photos",
    version: "5.0.0",
    description:
      "Experience a beautiful high-resolution photo every time you open a new browser tab. Fast, customizable, and clutter-free.",
    icons: {
      48: "48.png",
      64: "64.png",
      128: "128.png",
    },
    permissions: ["storage", "unlimitedStorage"],
    host_permissions: [
      "https://api.unsplash.com/*",
      "https://images.unsplash.com/*",
      "https://api.si.edu/*",
      "https://ids.si.edu/*",
      "https://www.gstatic.com/prettyearth/*",
    ],
    minimum_chrome_version: browser === "chrome" ? "150" : undefined,
    browser_specific_settings:
      browser === "firefox"
        ? {
            gecko: {
              id: "stellar@stellarapp.photos",
              strict_min_version: "153.0",
              data_collection_permissions: {
                required: ["none"],
              },
            },
          }
        : undefined,
  }),
  vite: ({ browser, mode }) => {
    const environment = process.env.STELLAR_ENV_FILE
      ? readEnvironmentFile(process.env.STELLAR_ENV_FILE)
      : { ...loadEnv(mode, process.cwd(), ""), ...process.env };
    const unsplashAccessKey = environment.UNSPLASH_ACCESS_KEY?.trim() ?? "";
    const smithsonianApiKey = environment.SMITHSONIAN_API_KEY?.trim() ?? "";

    const isPreparing =
      process.argv.includes("prepare") ||
      process.env.npm_lifecycle_event === "prepare";

    if (mode === "production" && !isPreparing) {
      if (!unsplashAccessKey) {
        throw new Error(
          "UNSPLASH_ACCESS_KEY is required for a production build",
        );
      }
      if (!smithsonianApiKey) {
        throw new Error(
          "SMITHSONIAN_API_KEY is required for a production build",
        );
      }
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
          unsplashAccessKey || "development-key",
        ),
        __SMITHSONIAN_API_KEY__: JSON.stringify(
          smithsonianApiKey || "DEMO_KEY",
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
