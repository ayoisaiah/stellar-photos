import { expect, test } from "./fixtures";

test.describe("Cross-tab synchronization", () => {
  test("display-mode change in tab A updates photo stage in tab B", async ({
    context,
    extensionId,
    openNewTab,
  }) => {
    const tabA = await openNewTab({ photoCount: 1 });
    await expect(tabA.locator(".photo-stage")).toHaveClass(/mode-cover/);

    const tabB = await context.newPage();
    await tabB.goto(`chrome-extension://${extensionId}/newtab.html`);
    await tabB.waitForLoadState("domcontentloaded");
    await expect(tabB.locator(".photo-stage")).toHaveClass(/mode-cover/);

    // Update display settings in Tab A to contain-blur
    await tabA.evaluate(async () => {
      await chrome.storage.sync.set({
        displaySettings: {
          version: 1,
          landscapeMode: "contain-blur",
          portraitMode: "contain-blur",
          motion: false,
        },
      });
    });

    // Tab B should automatically react to storage change and update its photo-stage
    await expect(tabB.locator(".photo-stage")).toHaveClass(/mode-contain-blur/);

    await tabA.close();
    await tabB.close();
  });

  test("disabling current photo's source in tab A causes tab B to swap photo", async ({
    context,
    extensionId,
    getWorker,
    openNewTab,
  }) => {
    const worker = await getWorker();

    // Enable both unsplash and smithsonian, seeded with an unsplash photo
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash", "smithsonian"],
          photoFrequency: "everyhour",
        },
      });
    });

    const tabA = await openNewTab({ photoCount: 1 });
    const tabB = await context.newPage();
    await tabB.goto(`chrome-extension://${extensionId}/newtab.html`);
    await tabB.waitForLoadState("domcontentloaded");

    const initialPhotographer = await tabB
      .locator(".bottom-credit .photographer-name")
      .innerText();
    expect(initialPhotographer).toBe("Photographer 1");

    // In Tab A, disable Unsplash, leaving only Smithsonian
    await tabA.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["smithsonian"],
          photoFrequency: "everyhour",
        },
      });
    });

    // Tab B detects current photo's source is no longer active and swaps to Smithsonian
    await expect(tabB.locator(".bottom-credit")).toContainText(
      "Smithsonian Open Access",
    );

    await tabA.close();
    await tabB.close();
  });

  for (const cached of [true, false]) {
    test(`disabling a pinned source transfers the pin to a ${cached ? "cached" : "fetched"} photo across reloads`, async ({
      getWorker,
      openNewTab,
      seedPhotos,
    }) => {
      const worker = await getWorker();
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          coreSettings: {
            version: 1,
            activeSourceIds: ["unsplash", "smithsonian"],
            photoFrequency: "everyhour",
          },
        });
      });

      const tab = await openNewTab();
      await expect(tab.locator(".bottom-credit")).toContainText(
        "Photographer 1",
      );
      await tab
        .getByRole("button", { name: "Pin this image", exact: true })
        .click();
      await expect(
        tab.getByRole("button", { name: "Unpin this image", exact: true }),
      ).toBeVisible();

      if (cached) {
        await seedPhotos(worker, 1, "landscape", "smithsonian");
        await tab
          .getByRole("button", { name: "Photo history", exact: true })
          .click();
        await expect(
          tab.getByRole("button", {
            name: "Set Smithsonian Work 1 as background",
          }),
        ).toBeVisible();
      }

      await tab
        .getByRole("button", { name: "Open settings", exact: true })
        .click();
      const unsplashCard = tab.locator(".source-card", { hasText: "Unsplash" });
      await unsplashCard.locator("label.source-toggle-label").click();
      await tab
        .getByRole("dialog", { name: "Settings", exact: true })
        .locator("button.close")
        .click();

      await expect(tab.locator(".bottom-credit")).toContainText(
        "Smithsonian Open Access",
      );
      await expect
        .poll(async () => {
          return worker.evaluate(async () => {
            const { stellarPinned } =
              await chrome.storage.local.get("stellarPinned");
            return (stellarPinned as { sourceId?: string } | undefined)
              ?.sourceId;
          });
        })
        .toBe("smithsonian");

      await tab.reload();
      await tab.mouse.move(100, 100);
      await expect(tab.locator(".bottom-credit")).toContainText(
        "Smithsonian Open Access",
      );
      await expect(
        tab.getByRole("button", { name: "Unpin this image", exact: true }),
      ).toBeVisible();

      await tab.close();
    });
  }
});
