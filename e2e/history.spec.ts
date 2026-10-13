import { expect, test } from "./fixtures";

test.describe("History Panel and Photo Navigation", () => {
  test.beforeEach(async ({ getWorker }) => {
    const worker = await getWorker();
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "everyhour",
        },
      });
    });
  });
  test("removes stale history cards when another tab removes the stored key", async ({
    openNewTab,
    context,
  }) => {
    const tab = await openNewTab({ photoCount: 3 });
    await tab.locator("button.history-toggle").click();

    const cards = tab.locator(".history-card");
    await expect(cards).toHaveCount(3);

    await context
      .serviceWorkers()[0]!
      .evaluate(() => chrome.storage.local.remove("stellarHistory"));

    await expect(cards).toHaveCount(1);
    await expect(cards).toHaveAttribute(
      "aria-label",
      "Set Photo description 1 as background",
    );
    await tab.close();
  });

  test("displays history thumbnails and selects photo on card click", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 3 });

    // Open history panel
    const historyToggle = tab.locator("button.history-toggle");
    await expect(historyToggle).toBeVisible();
    await historyToggle.click();

    const cards = tab.locator(".history-card");
    await expect(cards).toHaveCount(3);

    // Initial photo is the newest photo in history (photo 1)
    const attribution = tab.locator(".bottom-credit .photographer-name");
    await expect(attribution).toHaveText("Photographer 1");

    // Click card 3
    const card3 = tab.getByRole("button", {
      name: "Set Photo description 3 as background",
    });
    await expect(card3).toBeVisible();
    await card3.click();

    await expect(attribution).toHaveText("Photographer 3");

    await tab.close();
  });

  test("navigates history with Previous and Next navigation buttons", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 3 });
    await tab.mouse.move(100, 100);

    const photographerName = tab.locator(".bottom-credit .photographer-name");
    await expect(photographerName).toHaveText("Photographer 1");

    const prevButton = tab.getByRole("button", {
      name: "Previous photo",
      exact: true,
    });
    await expect(prevButton).toBeVisible();
    await prevButton.click();

    await expect(photographerName).toHaveText("Photographer 2");

    const nextButton = tab.getByRole("button", {
      name: "Next photo",
      exact: true,
    });
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    await expect(photographerName).toHaveText("Photographer 1");

    await tab.close();
  });
});
