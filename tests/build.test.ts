import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_OUT_DIR = ".wxt-test-dist";
const DIST_SENTINEL = "dist/.build-test-sentinel";
let distExisted = false;

beforeAll(async () => {
  distExisted = await stat("dist").then(
    () => true,
    () => false,
  );
  await mkdir("dist", { recursive: true });
  await writeFile(DIST_SENTINEL, "preserve");
});

afterAll(async () => {
  await rm(TEST_OUT_DIR, { recursive: true, force: true });
  await expect(readFile(DIST_SENTINEL, "utf8")).resolves.toBe("preserve");
  await rm(DIST_SENTINEL);
  if (!distExisted) await rmdir("dist");
});

describe("browser packages", () => {
  it.each(["chrome", "firefox"])(
    "builds a self-contained %s package",
    async (browser) => {
      const result = spawnSync(
        process.execPath,
        [
          "node_modules/wxt/bin/wxt.mjs",
          "build",
          "--browser",
          browser,
          "--mv3",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            STELLAR_OUT_DIR: TEST_OUT_DIR,
            UNSPLASH_ACCESS_KEY: "test-sentinel-key",
          },
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("ERROR");
      const root = `${TEST_OUT_DIR}/${browser}`;
      await expect(stat(`${root}/init.js`)).resolves.toBeTruthy();
      await expect(stat(`${root}/background.js`)).resolves.toBeTruthy();

      const page = await readFile(`${root}/newtab.html`, "utf8");
      const stylesheet = page.match(
        /href="\/(assets\/newtab-[^"]+\.css)"/,
      )?.[1];
      expect(stylesheet).toBeDefined();
      await expect(stat(`${root}/${stylesheet}`)).resolves.toBeTruthy();
      expect(page).toContain('<script src="/init.js"></script>');
      expect(page).toContain("<stellar-app></stellar-app>");
      expect(page).not.toMatch(/<script[^>]+(?:async|defer)/);

      const initBundle = await readFile(`${root}/init.js`, "utf8");
      expect(initBundle).toContain("stellar-app");
      expect(initBundle).toContain("stellar-empty-state");
      expect(initBundle).toContain("Your first photo is on its way.");

      const manifest = JSON.parse(
        await readFile(`${root}/manifest.json`, "utf8"),
      );
      expect(manifest.background).toEqual(
        browser === "chrome"
          ? { service_worker: "background.js" }
          : { scripts: ["background.js"] },
      );
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.chrome_url_overrides).toEqual({ newtab: "newtab.html" });
      if (browser === "chrome") {
        expect(manifest.minimum_chrome_version).toBe("150");
      } else {
        expect(manifest.browser_specific_settings.gecko).toMatchObject({
          id: "stellar@stellarapp.photos",
          strict_min_version: "153.0",
        });
      }

      const bundle = await readFile(`${root}/background.js`, "utf8");
      expect(bundle).not.toContain('from "');
      expect(bundle).not.toContain("old/");
      expect(bundle).toContain("test-sentinel-key");
      expect(bundle).not.toContain("__UNSPLASH_ACCESS_KEY__");
    },
  );

  it("refuses a production build without a key", () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      STELLAR_OUT_DIR: TEST_OUT_DIR,
      STELLAR_ENV_FILE: ".missing-test-env",
    };
    delete env.UNSPLASH_ACCESS_KEY;
    const result = spawnSync(
      process.execPath,
      ["node_modules/wxt/bin/wxt.mjs", "build", "--browser", "chrome", "--mv3"],
      { cwd: process.cwd(), env, encoding: "utf8" },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "UNSPLASH_ACCESS_KEY is required for a production build",
    );
  });

  it("maps development bundles to their TypeScript and CSS sources", async () => {
    const result = spawnSync(
      process.execPath,
      [
        "node_modules/wxt/bin/wxt.mjs",
        "build",
        "--browser",
        "chrome",
        "--mv3",
        "--mode",
        "development",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          STELLAR_OUT_DIR: TEST_OUT_DIR,
          UNSPLASH_ACCESS_KEY: "test-sentinel-key",
        },
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);

    const bundle = await readFile(`${TEST_OUT_DIR}/chrome/init.js`, "utf8");
    expect(bundle).not.toContain("@customElement(");

    const encodedMap = bundle.match(
      /sourceMappingURL=data:application\/json[^,]*;base64,([^\n]+)/,
    )?.[1];
    expect(encodedMap).toBeDefined();

    const sourceMap = JSON.parse(
      Buffer.from(encodedMap ?? "", "base64").toString("utf8"),
    ) as { sources: string[] };
    expect(sourceMap.sources).toEqual(
      expect.arrayContaining([
        "../../src/ts/components/empty-state.ts",
        "../../src/css/components/empty-state.css?inline",
      ]),
    );
  });
});
