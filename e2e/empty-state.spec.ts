import { expect, test } from "./fixtures";

test.describe("Empty State & Source Health", () => {
  test("first run automatically fetches photo, populates history and cache", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ seeded: false });
    const emptyState = tab.locator("stellar-empty-state");

    await expect(emptyState).toHaveAttribute("phase", "ready", {
      timeout: 10000,
    });
    await expect(
      tab.locator(".bottom-credit .photographer-name"),
    ).toBeVisible();

    const history = await tab.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: unknown[] };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(history).toHaveLength(1);

    const cacheStatus = await tab.evaluate(async () => {
      const cache = await caches.open("stellar-photos-images-v1");
      const requests = await cache.keys();
      const urls = requests.map((r) => r.url);
      return {
        hasImage: urls.some((url) => url.includes("/asset/")),
        hasThumb: urls.some((url) => url.includes("/thumbnail/")),
      };
    });
    expect(cacheStatus.hasImage).toBe(true);
    expect(cacheStatus.hasThumb).toBe(true);

    await tab.close();
  });
  test("displays empty state when unseeded and transitions to photo after seeding and retry", async ({
    openNewTab,
    seedPhotos,
    setupMockPipeline,
  }) => {
    await setupMockPipeline({ unsplashFails: true });
    const tab = await openNewTab({ seeded: false });

    const emptyState = tab.locator("stellar-empty-state");
    await expect(emptyState).toBeAttached();

    // Verify empty state is visible (phase is loading or error)
    await expect(emptyState).not.toHaveAttribute("phase", "ready");

    // Seed photos in cache and trigger retry via component or reload
    await seedPhotos(tab, 1);

    // If retry button is present, click it; otherwise reload
    const retryBtn = emptyState.getByRole("button", { name: "Try again" });
    if (await retryBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await retryBtn.click();
    } else {
      await tab.reload();
    }

    await expect(emptyState).toHaveAttribute("phase", "ready");
    await expect(
      tab.locator(".bottom-credit .photographer-name"),
    ).toBeVisible();

    await tab.close();
  });

  test("displays all-sources-down banner when all active sources are unhealthy", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 1 });

    // Mark the active source (unsplash) as unhealthy in local storage
    await tab.evaluate(async () => {
      await chrome.storage.local.set({
        sourceHealth: { unsplash: "Rate limit reached" },
      });
    });

    const banner = tab.locator(".all-sources-down-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Unable to retrieve new photos");

    // Recover source health
    await tab.evaluate(async () => {
      await chrome.storage.local.set({ sourceHealth: {} });
    });

    await expect(banner).toBeHidden();

    await tab.close();
  });

  test("displays all sources unavailable message in empty state when all sources are down", async ({
    openNewTab,
    setupMockPipeline,
  }) => {
    await setupMockPipeline({ unsplashFails: true });
    const tab = await openNewTab({ seeded: false });

    // Set sourceHealth and force error phase on empty state
    await tab.evaluate(async () => {
      await chrome.storage.local.set({
        sourceHealth: { unsplash: "API error" },
      });
      const app = document.querySelector("stellar-app") as unknown as {
        photoLoadState: string;
      };
      if (app) {
        app.photoLoadState = "error";
      }
    });

    const emptyState = tab.locator("stellar-empty-state");
    await expect(emptyState.locator("h1")).toHaveText(
      "Unable to retrieve new photos.",
    );
    await expect(emptyState.locator("p")).toContainText(
      "All enabled photo sources are temporarily unavailable",
    );

    await tab.close();
  });
});
