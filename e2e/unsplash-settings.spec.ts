import { expect, test } from "./fixtures";

test.describe("Unsplash Source Settings", () => {
  test("saves text settings on change only and persists changed fields", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();

    // Open settings drawer
    await tab.locator("button.settings-toggle").click();

    // Expand Unsplash settings
    const expandBtn = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const statusEl = tab.locator("stellar-unsplash-settings .status");

    // Type unfinished search keyword — input holds typing without triggering save
    const queryInput = tab.locator("#filter-query");
    await expect(queryInput).toBeVisible();
    await queryInput.pressSequentially("mountains");
    await expect(statusEl).toBeEmpty();

    // Trigger change event to save
    await queryInput.dispatchEvent("change");
    await expect(statusEl).toContainText("Saved");

    // Update photographer username on change
    const usernameInput = tab.locator("#filter-username");
    await usernameInput.fill("nasa");
    await usernameInput.dispatchEvent("change");
    await expect(statusEl).toContainText("Saved");

    // Update orientation dropdown
    const orientationSelect = tab.locator("#filter-orientation");
    await orientationSelect.selectOption("landscape");
    await expect(statusEl).toContainText("Saved");

    // Reload tab and verify persistence
    await tab.reload();
    await tab.mouse.move(100, 100);
    await tab.locator("button.settings-toggle").click();

    const expandBtnAfter = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtnAfter.click();

    await expect(tab.locator("#filter-query")).toHaveValue("mountains");
    await expect(tab.locator("#filter-username")).toHaveValue("nasa");
    await expect(tab.locator("#filter-orientation")).toHaveValue("landscape");

    await tab.close();
  });

  test("shows error status and reconciles failed value so it can be retried", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();

    await tab.locator("button.settings-toggle").click();

    const expandBtn = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtn.click();

    const orientationSelect = tab.locator("#filter-orientation");

    // Mock storage write failure on first call only
    await tab.evaluate(() => {
      const originalSet = chrome.storage.sync.set.bind(chrome.storage.sync);
      let failNext = true;
      chrome.storage.sync.set = async (items) => {
        if (failNext) {
          failNext = false;
          throw new Error("Simulated storage failure");
        }
        return originalSet(items);
      };
    });

    await orientationSelect.selectOption("portrait");

    await expect(
      tab.locator("stellar-unsplash-settings .status"),
    ).toContainText("Couldn’t save this setting.");

    // Failed write was reconciled back to previous value
    await expect(orientationSelect).toHaveValue("");

    // Retrying the same value is not discarded as unchanged and succeeds
    await orientationSelect.selectOption("portrait");

    await expect(
      tab.locator("stellar-unsplash-settings .status"),
    ).toContainText("Saved");

    // Reload tab and verify persisted to storage
    await tab.reload();
    await tab.mouse.move(100, 100);
    await tab.locator("button.settings-toggle").click();

    const expandBtnAfter = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtnAfter.click();

    await expect(tab.locator("#filter-orientation")).toHaveValue("portrait");

    await tab.close();
  });

  test("removes collection tag and persists updated tags", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();

    await tab.locator("button.settings-toggle").click();

    const expandBtn = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtn.click();

    // Default collection tag is 998309
    const defaultTag = tab.locator("#filter-collections .tag-label", {
      hasText: "998309",
    });
    await expect(defaultTag).toBeVisible();

    // Remove the tag
    const removeBtn = tab.getByRole("button", { name: "Remove 998309" });
    await removeBtn.click();

    await expect(defaultTag).toBeHidden();
    await expect(
      tab.locator("stellar-unsplash-settings .status"),
    ).toContainText("Saved");

    // Reload and verify tag remains removed
    await tab.reload();
    await tab.mouse.move(100, 100);
    await tab.locator("button.settings-toggle").click();

    const expandBtnAfter = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtnAfter.click();

    await expect(
      tab.locator("#filter-collections .tag-label", { hasText: "998309" }),
    ).toBeHidden();

    await tab.close();
  });

  test("validates and rejects invalid key, then accepts valid access key", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();

    // Mock Unsplash API endpoint for key validation
    let validationStatus = 401;
    await tab.route(
      "https://api.unsplash.com/photos?per_page=1",
      async (route) => {
        if (validationStatus === 401) {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({ errors: ["Invalid key"] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([{ id: "sample-photo" }]),
          });
        }
      },
    );

    await tab.locator("button.settings-toggle").click();

    const expandBtn = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtn.click();

    const keyInput = tab.locator("#unsplash-access-key");
    await expect(keyInput).toBeVisible();

    const submitBtn = tab.getByRole("button", { name: "Save and test" });

    // Test invalid key
    await keyInput.fill("invalid-key");
    await submitBtn.click();

    const errorEl = tab.locator("#access-key-error");
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toHaveText("Invalid Unsplash access key.");

    // Now switch to valid key response
    validationStatus = 200;
    await keyInput.fill("valid-key");
    await submitBtn.click();

    await expect(errorEl).toBeHidden();
    await expect(
      tab.locator("stellar-unsplash-settings .status"),
    ).toContainText("Saved");

    await tab.close();
  });

  test("preserves collection tag edits that reverse an in-flight save", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();

    await tab.locator("button.settings-toggle").click();

    const expandBtn = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtn.click();

    // Explicitly hold and release the first write to guarantee an in-flight reversal
    await tab.evaluate(() => {
      const originalSet = chrome.storage.sync.set.bind(chrome.storage.sync);
      let firstCall = true;
      let releaseWrite: () => void;
      const hold = new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
      let notifyHeld: () => void;
      const held = new Promise<void>((resolve) => {
        notifyHeld = resolve;
      });

      (
        window as unknown as { __firstWriteHeld: Promise<void> }
      ).__firstWriteHeld = held;
      (
        window as unknown as { __releaseFirstWrite: () => void }
      ).__releaseFirstWrite = releaseWrite!;

      chrome.storage.sync.set = async (items) => {
        if (firstCall) {
          firstCall = false;
          notifyHeld();
          await hold;
        }
        return originalSet(items);
      };
    });

    // Add tag 317099 via native input Enter
    const nativeInput = tab.locator("#filter-collections input.native-input");
    await expect(nativeInput).toBeVisible();
    await nativeInput.fill("317099");
    await nativeInput.press("Enter");

    // Wait until the first write has begun and is held
    await tab.evaluate(
      () =>
        (window as unknown as { __firstWriteHeld: Promise<void> })
          .__firstWriteHeld,
    );

    // Immediately remove it to reverse the addition while the first write is held in-flight
    const removeAddedTagBtn = tab.getByRole("button", {
      name: "Remove 317099",
    });
    await expect(removeAddedTagBtn).toBeVisible();
    await removeAddedTagBtn.click();

    // Release the held first write so both writes complete in order
    await tab.evaluate(() =>
      (
        window as unknown as { __releaseFirstWrite: () => void }
      ).__releaseFirstWrite(),
    );

    await expect(
      tab.locator("stellar-unsplash-settings .status"),
    ).toContainText("Saved");

    // Reload tab and verify reversed state is preserved in storage
    await tab.reload();
    await tab.mouse.move(100, 100);
    await tab.locator("button.settings-toggle").click();

    const expandBtnAfter = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtnAfter.click();

    await expect(
      tab.locator("#filter-collections .tag-label", { hasText: "998309" }),
    ).toBeVisible();
    await expect(
      tab.locator("#filter-collections .tag-label", { hasText: "317099" }),
    ).toBeHidden();

    await tab.close();
  });

  test("preserves newer edit when an in-flight write fails on the same field", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();

    await tab.locator("button.settings-toggle").click();

    const expandBtn = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtn.click();

    const orientationSelect = tab.locator("#filter-orientation");

    // Hold the first write and make it fail, while subsequent writes succeed
    await tab.evaluate(() => {
      const originalSet = chrome.storage.sync.set.bind(chrome.storage.sync);
      let firstCall = true;
      let releaseFirst: () => void;
      const hold = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      let notifyHeld: () => void;
      const held = new Promise<void>((resolve) => {
        notifyHeld = resolve;
      });

      (
        window as unknown as { __firstWriteHeld: Promise<void> }
      ).__firstWriteHeld = held;
      (
        window as unknown as { __releaseFirstWrite: () => void }
      ).__releaseFirstWrite = releaseFirst!;

      chrome.storage.sync.set = async (items) => {
        if (firstCall) {
          firstCall = false;
          notifyHeld();
          await hold;
          throw new Error("First write simulated failure");
        }
        return originalSet(items);
      };
    });

    // Write 1: portrait (will be held, then fail)
    await orientationSelect.selectOption("portrait");
    await tab.evaluate(
      () =>
        (window as unknown as { __firstWriteHeld: Promise<void> })
          .__firstWriteHeld,
    );

    // Queue Write 2 (landscape) and Write 3 (portrait) while Write 1 is held
    await orientationSelect.selectOption("landscape");
    await orientationSelect.selectOption("portrait");

    // Release Write 1 to fail; Write 2 and Write 3 should then proceed and persist portrait
    await tab.evaluate(() =>
      (
        window as unknown as { __releaseFirstWrite: () => void }
      ).__releaseFirstWrite(),
    );

    await expect(
      tab.locator("stellar-unsplash-settings .status"),
    ).toContainText("Saved");

    // Verify UI holds portrait and did not roll back to initial empty string
    await expect(orientationSelect).toHaveValue("portrait");

    // Reload tab and verify portrait was saved to storage
    await tab.reload();
    await tab.mouse.move(100, 100);
    await tab.locator("button.settings-toggle").click();

    const expandBtnAfter = tab.getByRole("button", {
      name: "Expand Unsplash settings",
    });
    await expandBtnAfter.click();

    await expect(tab.locator("#filter-orientation")).toHaveValue("portrait");

    await tab.close();
  });
});
