import { resolve } from "node:path";
import { test as base, chromium, expect } from "@playwright/test";

const test = base.extend({
  context: async ({ headless }, use) => {
    const extensionPath = resolve(".wxt-e2e-dist/chrome");
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless,
      offline: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});

test("photo frequency survives a reload", async ({ context, page }) => {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).host;
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  await page.mouse.move(100, 100);

  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settings).toBeVisible();
  await expect(
    settings.getByRole("radio", { name: /^Every new tab/ }),
  ).toBeChecked();
  await settings.getByRole("radio", { name: /^Every hour/ }).check();

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { coreSettings } = await chrome.storage.sync.get("coreSettings");
        return coreSettings;
      }),
    )
    .toMatchObject({ photoFrequency: "everyhour" });

  await page.reload();
  await page.mouse.move(100, 100);
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await expect(
    settings.getByRole("radio", { name: /^Every hour/ }),
  ).toBeChecked();
  await expect(
    settings.getByRole("radio", { name: /^Every new tab/ }),
  ).not.toBeChecked();
});
