import { expect, test } from "./fixtures";

test.describe("Photo Display and Controls", () => {
  test("reveals controls on mouse movement", async ({ openNewTab }) => {
    const tab = await openNewTab();

    await tab.mouse.move(200, 200);
    const bottomActions = tab.locator(".bottom-actions");
    await expect(bottomActions).toBeVisible();

    const settingsBtn = tab.getByRole("button", {
      name: "Open settings",
      exact: true,
    });
    await expect(settingsBtn).toBeVisible();

    await tab.close();
  });

  test("toggles photo pinning and persists pin state", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    await tab.mouse.move(100, 100);

    const pinButton = tab.getByRole("button", {
      name: "Pin this image",
      exact: true,
    });
    await expect(pinButton).toBeVisible();
    await pinButton.click();

    const unpinButton = tab.getByRole("button", {
      name: "Unpin this image",
      exact: true,
    });
    await expect(unpinButton).toBeVisible();

    // Verify pin state in storage
    await expect
      .poll(() =>
        tab.evaluate(async () => {
          const { stellarPinned } =
            await chrome.storage.local.get("stellarPinned");
          return Boolean(stellarPinned);
        }),
      )
      .toBe(true);

    // Reload page and verify still pinned
    await tab.reload();
    await tab.mouse.move(100, 100);
    await expect(
      tab.getByRole("button", {
        name: "Unpin this image",
        exact: true,
      }),
    ).toBeVisible();

    // Unpin
    await tab
      .getByRole("button", { name: "Unpin this image", exact: true })
      .click();
    await expect(
      tab.getByRole("button", { name: "Pin this image", exact: true }),
    ).toBeVisible();

    await expect
      .poll(() =>
        tab.evaluate(async () => {
          const { stellarPinned } =
            await chrome.storage.local.get("stellarPinned");
          return stellarPinned;
        }),
      )
      .toBeNull();

    await tab.close();
  });

  test("renders photo stage and photographer attribution", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    await tab.mouse.move(100, 100);

    const photoStage = tab.locator(".photo-stage");
    await expect(photoStage).toBeVisible();

    const photographerName = tab.locator(".bottom-credit .photographer-name");
    await expect(photographerName).toBeVisible();
    await expect(photographerName).toHaveText("Photographer 1");

    await tab.close();
  });
});
