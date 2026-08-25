import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { resolveBuildAccessKey } from "./build-config";

type Browser = "chrome" | "firefox";

const browserArg = process.argv.find((argument) =>
  argument.startsWith("--browser="),
);
const browser = (browserArg?.split("=")[1] ?? "chrome") as Browser;
if (browser !== "chrome" && browser !== "firefox") {
  throw new Error(`Unsupported browser: ${browser}`);
}

let dotenvContent: string | undefined;
if (!process.env.UNSPLASH_ACCESS_KEY?.trim()) {
  try {
    dotenvContent = await readFile(
      process.env.STELLAR_ENV_FILE ?? ".env",
      "utf8",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
const accessKey = resolveBuildAccessKey(process.env, dotenvContent);
const dev = process.argv.includes("--dev");
if (!dev && !accessKey) {
  throw new Error("UNSPLASH_ACCESS_KEY is required for a production build");
}

const outdir = `dist/${browser}`;
await rm(outdir, { force: true, recursive: true });
await mkdir(`${outdir}/js`, { recursive: true });
await Promise.all([
  cp("src/icons", `${outdir}/icons`, { recursive: true }),
  cp("src/css", `${outdir}/css`, { recursive: true }),
  cp("src/index.html", `${outdir}/index.html`),
]);

await build({
  entryPoints: {
    init: "src/js/init.ts",
    "service-worker": "src/js/service-worker.ts",
  },
  outdir: `${outdir}/js`,
  bundle: true,
  format: "iife",
  target: browser === "chrome" ? "chrome150" : "firefox153",
  sourcemap: false,
  minify: !dev,
  define: {
    __UNSPLASH_ACCESS_KEY__: JSON.stringify(accessKey ?? "development-key"),
  },
});

const baseManifest = JSON.parse(await readFile("src/manifest.json", "utf8"));
baseManifest.minimum_chrome_version = undefined;
baseManifest.browser_specific_settings = undefined;
baseManifest.background =
  browser === "chrome"
    ? { service_worker: "js/service-worker.js" }
    : { scripts: ["js/service-worker.js"] };
if (browser === "chrome") baseManifest.minimum_chrome_version = "150";
if (browser === "firefox") {
  baseManifest.browser_specific_settings = {
    gecko: { id: "stellar-photos@freshman.tech", strict_min_version: "153.0" },
  };
}
await writeFile(
  `${outdir}/manifest.json`,
  `${JSON.stringify(baseManifest, null, 2)}\n`,
);
console.log(`Built ${browser} extension in ${outdir}`);
