import { spawnSync } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";

import { afterAll, describe, expect, it } from "vitest";

afterAll(async () => {
  await rm("dist", { recursive: true, force: true });
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
          env: { ...process.env, UNSPLASH_ACCESS_KEY: "test-sentinel-key" },
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("ERROR");
      const root = `dist/${browser}`;
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
          id: "stellar-photos@freshman.tech",
          strict_min_version: "153.0",
        });
      }

      const bundle = await readFile(`${root}/background.js`, "utf8");
      expect(bundle).not.toContain('from "');
      expect(bundle).not.toContain("old/");
    },
  );

  it("refuses a production build without a key", () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      STELLAR_ENV_FILE: ".missing-test-env",
    };
    delete env.UNSPLASH_ACCESS_KEY;
    const result = spawnSync(
      process.execPath,
      ["node_modules/wxt/bin/wxt.mjs", "build", "--browser", "chrome", "--mv3"],
      { env, encoding: "utf8" },
    );
    expect(result.status).not.toBe(0);
  });
});
