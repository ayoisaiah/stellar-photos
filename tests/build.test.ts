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
        ["--import", "tsx", "build.ts", `--browser=${browser}`],
        {
          cwd: process.cwd(),
          env: { ...process.env, UNSPLASH_ACCESS_KEY: "test-sentinel-key" },
          encoding: "utf8",
        },
      );
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      const root = `dist/${browser}`;
      await expect(stat(`${root}/js/init.js`)).resolves.toBeTruthy();
      await expect(stat(`${root}/js/service-worker.js`)).resolves.toBeTruthy();
      const manifest = JSON.parse(
        await readFile(`${root}/manifest.json`, "utf8"),
      );
      expect(manifest.background).toEqual(
        browser === "chrome"
          ? { service_worker: "js/service-worker.js" }
          : { scripts: ["js/service-worker.js"] },
      );
      const bundle = await readFile(`${root}/js/service-worker.js`, "utf8");
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
      ["--import", "tsx", "build.ts", "--browser=chrome"],
      { env, encoding: "utf8" },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("UNSPLASH_ACCESS_KEY is required");
  });
});
