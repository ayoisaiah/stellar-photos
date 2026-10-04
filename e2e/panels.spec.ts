import { expect, test } from "./fixtures";

test.describe("Panels and Overlays", () => {
  test("opens and closes settings drawer via button and close icon", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    const settingsToggle = tab.getByRole("button", {
      name: "Open settings",
      exact: true,
    });
    await expect(settingsToggle).toBeVisible();
    await settingsToggle.click();

    const drawer = tab.getByRole("dialog", { name: "Settings", exact: true });
    await expect(drawer).toBeVisible();

    const closeButton = drawer.locator("button.close");
    await closeButton.click();
    await expect(drawer).not.toBeVisible();

    await tab.close();
  });

  test("opens and closes photo info modal", async ({ openNewTab }) => {
    const tab = await openNewTab();
    const infoToggle = tab.getByRole("button", {
      name: "Photo info",
      exact: true,
    });

    await expect(infoToggle).toBeVisible();
    await infoToggle.click();

    const infoDialog = tab.getByRole("dialog");
    await expect(infoDialog).toBeVisible();

    const closeInfo = infoDialog.locator("button.close-button");
    await closeInfo.click();
    await expect(infoDialog).not.toBeVisible();

    await tab.close();
  });

  test("closes settings drawer when backdrop is clicked", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    const settingsToggle = tab.getByRole("button", {
      name: "Open settings",
      exact: true,
    });

    await settingsToggle.click();
    const settings = tab.getByRole("dialog", {
      name: "Settings",
      exact: true,
    });
    await expect(settings).toBeVisible();

    // Click backdrop button outside the drawer
    await tab
      .locator("stellar-settings-drawer .backdrop")
      .click({ position: { x: 50, y: 50 } });
    await expect(settings).not.toBeVisible();

    await tab.close();
  });

  test("toggles history panel open and closed", async ({ openNewTab }) => {
    const tab = await openNewTab();
    const historyToggle = tab.locator("button.history-toggle");

    await expect(historyToggle).toBeVisible();
    await historyToggle.click();

    await expect(historyToggle).toHaveAttribute("aria-expanded", "true");
    await expect(tab.locator(".app-viewport")).toHaveClass(/history-open/);

    await historyToggle.click();

    await expect(historyToggle).toHaveAttribute("aria-expanded", "false");
    await expect(tab.locator(".app-viewport")).not.toHaveClass(/history-open/);

    await tab.close();
  });
});
