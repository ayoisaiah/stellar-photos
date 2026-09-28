import { defineConfig } from "@playwright/test";

const config = defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});

export { config as default };
