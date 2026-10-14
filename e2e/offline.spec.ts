import { expect, test } from "./fixtures";

test.describe("Offline behavior", () => {
  test("offline unseeded state shows connection message without marking sources unhealthy", async ({
    context,
    openNewTab,
  }) => {
    await context.setOffline(true);
    await context.route("https://api.unsplash.com/**", (route) =>
      route.abort(),
    );
    await context.route("https://api.si.edu/**", (route) => route.abort());
    await context.route("https://www.gstatic.com/**", (route) => route.abort());

    const tab = await openNewTab({ seeded: false });
    const emptyState = tab.locator("stellar-empty-state");

    await expect(emptyState).toHaveAttribute("phase", "error", {
      timeout: 10000,
    });
    await expect(emptyState.locator("h1")).toHaveText(
      "We couldn’t find a photo just yet.",
    );
    await expect(emptyState.locator("p")).toContainText(
      "Check your connection and try again.",
    );

    const health = await tab.evaluate(async () => {
      const { sourceHealth } = await chrome.storage.local.get("sourceHealth");
      return (sourceHealth as Record<string, string>) ?? {};
    });
    expect(Object.keys(health)).toHaveLength(0);

    await expect(tab.locator(".all-sources-down-banner")).toBeHidden();
    await tab.close();
  });

  test("offline with cached photo renders photo and does not show all-sources-down banner", async ({
    context,
    extensionId,
    openNewTab,
  }) => {
    const tab1 = await openNewTab({ photoCount: 1 });
    await expect(
      tab1.locator(".bottom-credit .photographer-name"),
    ).toBeVisible();

    await context.setOffline(true);

    const tab2 = await context.newPage();
    await tab2.goto(`chrome-extension://${extensionId}/newtab.html`);
    await tab2.waitForLoadState("domcontentloaded");

    await expect(
      tab2.locator(".bottom-credit .photographer-name"),
    ).toBeVisible();
    await expect(tab2.locator(".all-sources-down-banner")).toBeHidden();

    const health = await tab2.evaluate(async () => {
      const { sourceHealth } = await chrome.storage.local.get("sourceHealth");
      return (sourceHealth as Record<string, string>) ?? {};
    });
    expect(Object.keys(health)).toHaveLength(0);

    await tab1.close();
    await tab2.close();
  });
});
