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
});
