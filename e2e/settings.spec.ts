import { expect, test } from "./fixtures";

test.describe("Settings Drawer", () => {
  test("photo frequency survives a reload", async ({ openNewTab, page }) => {
    const tab = await openNewTab();
    await tab
      .getByRole("button", { name: "Open settings", exact: true })
      .click();

    const settings = tab.getByRole("dialog", {
      name: "Settings",
      exact: true,
    });
    await expect(settings).toBeVisible();
    await expect(
      settings.getByRole("radio", { name: /^Every new tab/ }),
    ).toBeChecked();

    await settings.getByRole("radio", { name: /^Every hour/ }).check();

    await expect
      .poll(() =>
        tab.evaluate(async () => {
          const { coreSettings } =
            await chrome.storage.sync.get("coreSettings");
          return coreSettings;
        }),
      )
      .toMatchObject({ photoFrequency: "everyhour" });

    await tab.reload();
    await tab.mouse.move(100, 100);
    await tab
      .getByRole("button", { name: "Open settings", exact: true })
      .click();

    await expect(
      settings.getByRole("radio", { name: /^Every hour/ }),
    ).toBeChecked();
    await expect(
      settings.getByRole("radio", { name: /^Every new tab/ }),
    ).not.toBeChecked();

    await tab.close();
  });

  test("toggles photo sources and saves to storage", async ({ openNewTab }) => {
    const tab = await openNewTab();
    await tab
      .getByRole("button", { name: "Open settings", exact: true })
      .click();

    const settings = tab.getByRole("dialog", {
      name: "Settings",
      exact: true,
    });
    await expect(settings).toBeVisible();

    const earthViewCard = settings.locator(".source-card", {
      hasText: "Google Earth View",
    });
    const earthViewCheckbox = earthViewCard.getByRole("checkbox");

    await expect(earthViewCheckbox).not.toBeChecked();
    await earthViewCard.locator("label.source-toggle-label").click();
    await expect(earthViewCheckbox).toBeChecked();

    await expect
      .poll(() =>
        tab.evaluate(async () => {
          const { coreSettings } = (await chrome.storage.sync.get(
            "coreSettings",
          )) as { coreSettings?: { activeSourceIds?: string[] } };
          return coreSettings?.activeSourceIds;
        }),
      )
      .toEqual(expect.arrayContaining(["unsplash", "earthview"]));

    await tab.close();
  });

  test("prevents disabling the last remaining active source", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    await tab
      .getByRole("button", { name: "Open settings", exact: true })
      .click();

    const settings = tab.getByRole("dialog", {
      name: "Settings",
      exact: true,
    });
    await expect(settings).toBeVisible();

    // Default configuration has only Unsplash active
    const unsplashCheckbox = settings
      .locator(".source-card", { hasText: "Unsplash" })
      .getByRole("checkbox");

    await expect(unsplashCheckbox).toBeChecked();
    await expect(unsplashCheckbox).toBeDisabled();

    await tab.close();
  });

  test("updates subtle motion display setting", async ({ openNewTab }) => {
    const tab = await openNewTab();
    await tab
      .getByRole("button", { name: "Open settings", exact: true })
      .click();

    const settings = tab.getByRole("dialog", {
      name: "Settings",
      exact: true,
    });
    await expect(settings).toBeVisible();

    const motionLabel = settings.locator("label", {
      hasText: "Subtle motion",
    });
    const motionCheckbox = motionLabel.getByRole("checkbox");

    await expect(motionCheckbox).not.toBeChecked();
    await motionLabel.click();
    await expect(motionCheckbox).toBeChecked();

    await expect
      .poll(() =>
        tab.evaluate(async () => {
          const { displaySettings } = (await chrome.storage.sync.get(
            "displaySettings",
          )) as { displaySettings?: { motion?: boolean } };
          return displaySettings?.motion;
        }),
      )
      .toBe(true);

    await tab.close();
  });
});
