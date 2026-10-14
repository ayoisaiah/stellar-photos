import { expect, test } from "./fixtures";

test.describe("Local Folder via OPFS", () => {
  test("adds a local directory, rotates to local photo, and removes folder", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 1 });

    // Populate OPFS with a subfolder containing a test JPEG
    await tab.evaluate(async () => {
      const res = await fetch("https://images.example.com/test.jpg");
      const blob = await res.blob();

      const opfsRoot = await navigator.storage.getDirectory();
      const photosDir = await opfsRoot.getDirectoryHandle("Vacation Photos", {
        create: true,
      });
      const fileHandle = await photosDir.getFileHandle("sunset.jpg", {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      const win = window as unknown as {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
      };
      win.showDirectoryPicker = async () => photosDir;
    });

    // Open settings drawer
    const settingsToggle = tab.getByRole("button", {
      name: "Open settings",
      exact: true,
    });
    await settingsToggle.click();

    const drawer = tab.getByRole("dialog", { name: "Settings", exact: true });
    await expect(drawer).toBeVisible();

    // Expand Local folder settings
    const expandBtn = drawer.getByRole("button", {
      name: "Expand Local folder settings",
    });
    await expandBtn.click();

    // Click "Select folder" button in stellar-local-settings
    const selectFolderBtn = drawer.locator("button.btn-select", {
      hasText: "Select folder",
    });
    await expect(selectFolderBtn).toBeVisible();
    await selectFolderBtn.click();

    // Verify folder card appears with folder name and count
    const folderCard = drawer.locator(".folder-card");
    await expect(folderCard.locator(".folder-name")).toHaveText(
      "Vacation Photos",
    );
    await expect(folderCard.locator(".folder-count")).toHaveText("1 photo");
    await expect(drawer.locator(".total-summary")).toHaveText(
      "Total: 1 photo across 1 folder",
    );

    // Enable Local folder and disable Unsplash so only local is active
    const localCard = drawer.locator(".source-card", {
      hasText: "Local folder",
    });
    const localCheckbox = localCard.getByRole("checkbox");
    if (!(await localCheckbox.isChecked())) {
      await localCard.locator("label.source-toggle-label").click();
      await expect(localCheckbox).toBeChecked();
    }

    const unsplashCard = drawer.locator(".source-card", {
      hasText: "Unsplash",
    });
    const unsplashCheckbox = unsplashCard.getByRole("checkbox");
    if (await unsplashCheckbox.isChecked()) {
      await unsplashCard.locator("label.source-toggle-label").click();
      await expect(unsplashCheckbox).not.toBeChecked();
    }

    // Close settings
    const closeBtn = drawer.locator("button.close");
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();

    // Verify history now records the local photo
    await expect
      .poll(async () => {
        return tab.evaluate(async () => {
          const stored = await chrome.storage.local.get("stellarHistory");
          const history = (
            stored.stellarHistory as
              | { history: Array<{ sourceId: string; description: string }> }
              | undefined
          )?.history;
          return history?.[0]?.sourceId;
        });
      })
      .toBe("local");

    // The stage should show the image without all-sources-down banner
    const photoStage = tab.locator(".photo-stage");
    await expect(photoStage).toBeVisible();
    await expect(tab.locator(".all-sources-down-banner")).not.toBeVisible();

    // Reopen settings and remove the folder
    await settingsToggle.click();
    await expect(drawer).toBeVisible();

    // Expand Local folder settings again if needed
    const expandBtnReopen = drawer
      .getByRole("button", {
        name: /settings/,
      })
      .filter({ hasText: "Local folder" });
    if (await expandBtnReopen.isVisible()) {
      await expandBtnReopen.click();
    }

    const removeBtn = drawer.locator("button.btn-remove");
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // Folder card empty state should reappear
    await expect(drawer.locator(".folder-card.empty-state")).toBeVisible();

    await tab.close();
  });
});
