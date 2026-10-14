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

  test("renders photo stage, photographer attribution, and decodes photo image", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab();
    await tab.mouse.move(100, 100);

    const photoStage = tab.locator(".photo-stage");
    await expect(photoStage).toBeVisible();

    const photographerName = tab.locator(".bottom-credit .photographer-name");
    await expect(photographerName).toBeVisible();
    await expect(photographerName).toHaveText("Photographer 1");

    // Assert the photo image decodes successfully
    const decodes = await tab.evaluate(async () => {
      const app = document.querySelector("stellar-app");
      const photoMain = (app?.shadowRoot ?? document).querySelector(
        ".photo-main",
      ) as HTMLElement | null;
      if (!photoMain) return false;
      const bg = photoMain.style.backgroundImage;
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (!match?.[1]) return false;

      const img = new Image();
      img.src = match[1];
      try {
        await img.decode();
        return img.naturalWidth > 0 && img.naturalHeight > 0;
      } catch {
        return false;
      }
    });
    expect(decodes).toBe(true);

    await tab.close();
  });

  test("renders portrait photo and decodes taller than it is wide", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ orientation: "portrait" });
    await tab.mouse.move(100, 100);

    const photoStage = tab.locator(".photo-stage");
    await expect(photoStage).toBeVisible();

    const dimensions = await tab.evaluate(async () => {
      const app = document.querySelector("stellar-app");
      const photoMain = (app?.shadowRoot ?? document).querySelector(
        ".photo-main",
      ) as HTMLElement | null;
      if (!photoMain) return null;
      const bg = photoMain.style.backgroundImage;
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (!match?.[1]) return null;

      const img = new Image();
      img.src = match[1];
      try {
        await img.decode();
        return { width: img.naturalWidth, height: img.naturalHeight };
      } catch {
        return null;
      }
    });

    expect(dimensions).not.toBeNull();
    expect(dimensions!.height).toBeGreaterThan(dimensions!.width);

    await tab.close();
  });

  test("portrait contain-blur uses thumbnail backdrop and falls back to main image URL if thumbnail is missing", async ({
    getWorker,
    openNewTab,
  }) => {
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

    const tab = await openNewTab({ orientation: "portrait" });
    const photoStage = tab.locator(".photo-stage");
    await expect(photoStage).toHaveClass(/mode-contain-blur/);

    const getStageUrls = async () => {
      return tab.evaluate(() => {
        const app = document.querySelector("stellar-app");
        const root = app?.shadowRoot ?? document;
        const main = root.querySelector(".photo-main") as HTMLElement | null;
        const backdrop = root.querySelector(
          ".photo-backdrop",
        ) as HTMLElement | null;
        return {
          main: main?.style.backgroundImage ?? "",
          backdrop: backdrop?.style.backgroundImage ?? "",
        };
      });
    };

    const initialUrls = await getStageUrls();
    expect(initialUrls.main).toBeTruthy();
    expect(initialUrls.backdrop).toBeTruthy();
    expect(initialUrls.backdrop).not.toEqual(initialUrls.main);

    await tab.evaluate(async () => {
      const cache = await caches.open("stellar-photos-images-v1");
      const keys = await cache.keys();
      for (const req of keys) {
        if (req.url.includes("/thumbnail/")) {
          await cache.delete(req);
        }
      }
    });

    await tab.reload();
    await expect(tab.locator(".photo-stage")).toHaveClass(/mode-contain-blur/);

    const fallbackUrls = await getStageUrls();
    expect(fallbackUrls.main).toBeTruthy();
    expect(fallbackUrls.backdrop).toEqual(fallbackUrls.main);

    await tab.close();
  });
});
