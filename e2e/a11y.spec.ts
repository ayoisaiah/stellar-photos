import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

function createAudit(page: Page) {
  return new AxeBuilder({ page }).disableRules([
    "landmark-one-main",
    "page-has-heading-one",
    "region",
  ]);
}

test.describe("Accessibility audits", () => {
  test("main new tab view passes accessibility audit", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    const results = await createAudit(tab).analyze();

    expect(results.violations).toEqual([]);
    await tab.close();
  });

  test("history panel passes accessibility audit", async ({ openNewTab }) => {
    const tab = await openNewTab({ photoCount: 3 });
    const historyToggle = tab.locator("button.history-toggle");
    await historyToggle.click();
    await expect(tab.locator(".app-viewport")).toHaveClass(/history-open/);

    const results = await createAudit(tab).analyze();

    expect(results.violations).toEqual([]);
    await tab.close();
  });

  test("photo info modal passes accessibility audit", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    const infoToggle = tab.getByRole("button", {
      name: "Photo info",
      exact: true,
    });
    await infoToggle.click();
    await expect(tab.getByRole("dialog")).toBeVisible();

    const results = await createAudit(tab).analyze();

    expect(results.violations).toEqual([]);
    await tab.close();
  });

  test("settings drawer passes accessibility audit", async ({ openNewTab }) => {
    const tab = await openNewTab();
    const settingsToggle = tab.getByRole("button", { name: "Open settings" });
    await settingsToggle.click();
    await expect(tab.getByRole("dialog", { name: "Settings" })).toBeVisible();

    const results = await createAudit(tab).analyze();

    expect(results.violations).toEqual([]);
    await tab.close();
  });
});
