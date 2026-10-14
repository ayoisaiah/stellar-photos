import { expect, test } from "./fixtures";

test.describe("Keyboard Shortcuts", () => {
  test("Escape key closes settings drawer", async ({ openNewTab }) => {
    const tab = await openNewTab();
    await tab
      .getByRole("button", { name: "Open settings", exact: true })
      .click();

    const drawer = tab.getByRole("dialog", { name: "Settings", exact: true });
    await expect(drawer).toBeVisible();

    await tab.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();

    await tab.close();
  });

  test("p key toggles image pin state", async ({ openNewTab }) => {
    const tab = await openNewTab();

    // Move mouse to ensure controls are active
    await tab.mouse.move(100, 100);

    const pinButton = tab.getByRole("button", { name: "Pin this image" });
    await expect(pinButton).toBeVisible();

    await tab.keyboard.press("p");

    const unpinButton = tab.getByRole("button", { name: "Unpin this image" });
    await expect(unpinButton).toBeVisible();

    // Press p again to unpin
    await tab.keyboard.press("p");
    await expect(pinButton).toBeVisible();

    await tab.close();
  });

  test("ignores keyboard shortcuts while focused in text inputs", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    await tab
      .getByRole("button", { name: "Open settings", exact: true })
      .click();

    const drawer = tab.getByRole("dialog", { name: "Settings", exact: true });
    await expect(drawer).toBeVisible();

    // Expand Unsplash settings to render text inputs
    const expandBtn = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const textInput = drawer.locator("#filter-query");
    await expect(textInput).toBeVisible();
    await textInput.focus();

    await tab.keyboard.press("p");
    await expect(textInput).toHaveValue("p");

    // Drawer should stay open and p shouldn't toggle pin state
    await expect(drawer).toBeVisible();
    await expect(
      tab.getByRole("button", { name: "Unpin this image" }),
    ).toBeHidden();

    const pinned = await tab.evaluate(async () => {
      const res = await chrome.storage.local.get("stellarPinned");
      return res.stellarPinned;
    });
    expect(pinned).toBeFalsy();

    await tab.close();
  });

  test("ArrowLeft and ArrowRight keys navigate backward and forward through history", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 3 });

    const photographer = tab.locator(".bottom-credit .photographer-name");
    await expect(photographer).toHaveText("Photographer 1");

    await tab.keyboard.press("ArrowLeft");
    await expect(photographer).toHaveText("Photographer 2");

    await tab.keyboard.press("ArrowLeft");
    await expect(photographer).toHaveText("Photographer 3");

    await tab.keyboard.press("ArrowRight");
    await expect(photographer).toHaveText("Photographer 2");

    await tab.close();
  });

  test("wheel event opens and closes history panel", async ({ openNewTab }) => {
    const tab = await openNewTab();
    const viewport = tab.locator(".app-viewport");
    await expect(viewport).not.toHaveClass(/history-open/);

    // Negative deltaY (scrolling up) opens history panel
    await tab.mouse.wheel(0, -60);
    await expect(viewport).toHaveClass(/history-open/);

    // Positive deltaY (scrolling down) closes history panel
    await tab.mouse.wheel(0, 60);
    await expect(viewport).not.toHaveClass(/history-open/);

    await tab.close();
  });

  test("wheel event on history panel navigates history photos", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 3 });
    const historyToggle = tab.locator("button.history-toggle");
    await historyToggle.click();
    await expect(tab.locator(".app-viewport")).toHaveClass(/history-open/);

    const photographer = tab.locator(".bottom-credit .photographer-name");
    await expect(photographer).toHaveText("Photographer 1");

    // Wheel event on history panel with deltaY > 15 triggers navigateHistory(1)
    await tab.locator("stellar-history-panel").dispatchEvent("wheel", {
      deltaX: 0,
      deltaY: 30,
    });
    await expect(photographer).toHaveText("Photographer 2");

    // Wait for the 200ms wheel throttle
    await tab.waitForTimeout(250);

    // Wheel event on history panel with deltaY < -15 triggers navigateHistory(-1)
    await tab.locator("stellar-history-panel").dispatchEvent("wheel", {
      deltaX: 0,
      deltaY: -30,
    });
    await expect(photographer).toHaveText("Photographer 1");

    await tab.close();
  });
});
