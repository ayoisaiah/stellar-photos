import { expect, test } from "./fixtures";

test.describe("Photo Downloads", () => {
  test("triggers browser download with expected filename from bottom actions", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 1 });

    // Spy on chrome.downloads.download
    await tab.evaluate(() => {
      const g = window as unknown as {
        __downloads: Array<chrome.downloads.DownloadOptions>;
      };
      g.__downloads = [];
      chrome.downloads.download = (
        options: chrome.downloads.DownloadOptions,
      ) => {
        g.__downloads.push(options);
        return Promise.resolve(1);
      };
    });

    const downloadButton = tab.locator("button.download-button");
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    // Verify download was invoked
    await expect
      .poll(async () => {
        return tab.evaluate(() => {
          const g = window as unknown as {
            __downloads: Array<{ url: string; filename: string }>;
          };
          return g.__downloads;
        });
      })
      .toEqual([
        {
          url: "https://images.unsplash.com/photo-test-1",
          filename: "unsplash-test-photo-1.jpg",
        },
      ]);

    await tab.close();
  });

  test("triggers download from history card action button", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 2 });

    await tab.evaluate(() => {
      const g = window as unknown as {
        __downloads: Array<chrome.downloads.DownloadOptions>;
      };
      g.__downloads = [];
      chrome.downloads.download = (
        options: chrome.downloads.DownloadOptions,
      ) => {
        g.__downloads.push(options);
        return Promise.resolve(1);
      };
    });

    const historyToggle = tab.locator("button.history-toggle");
    await historyToggle.click();

    const card = tab.getByRole("button", {
      name: "Set Photo description 1 as background",
    });
    await expect(card).toBeVisible();
    await card.hover();

    const downloadButton = card.locator("button.download-btn");
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    await expect
      .poll(async () => {
        return tab.evaluate(() => {
          const g = window as unknown as {
            __downloads: Array<{ url: string; filename: string }>;
          };
          return g.__downloads;
        });
      })
      .toEqual([
        {
          url: "https://images.unsplash.com/photo-test-1",
          filename: "unsplash-test-photo-1.jpg",
        },
      ]);

    await tab.close();
  });

  test("alerts the user if download initiation fails", async ({
    openNewTab,
  }) => {
    const tab = await openNewTab({ photoCount: 1 });

    await tab.evaluate(() => {
      chrome.downloads.download = () =>
        Promise.reject(new Error("Network failure"));
    });

    let dialogMessage = "";
    tab.once("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    const downloadButton = tab.locator("button.download-button");
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    expect(dialogMessage).toBe(
      "Couldn’t start the download. Please try again.",
    );

    await tab.close();
  });
});
