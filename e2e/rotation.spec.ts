import { expect, test } from "./fixtures";

test.describe("nextImage rotation pipeline", () => {
  test("pinned photos skip rotation", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    await setupMockPipeline();
    const worker = await getWorker();

    // Configure frequency to 'everyhour' initially so openNewTab does not rotate on tab load
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "everyhour",
        },
      });
    });

    // Seed 1 photo and pin it
    const tab = await openNewTab({ photoCount: 1 });
    await tab.mouse.move(100, 100);

    const pinButton = tab.getByRole("button", {
      name: "Pin this image",
      exact: true,
    });
    await expect(pinButton).toBeVisible();
    await pinButton.click();

    // Verify pinned state exists in storage
    const pinnedState = await worker.evaluate(async () => {
      const { stellarPinned } = await chrome.storage.local.get("stellarPinned");
      return stellarPinned;
    });
    expect(pinnedState).toBeTruthy();

    const historyBefore = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceAssetId: string }> };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(historyBefore).toHaveLength(1);

    // Set frequency to 'newtab' so nextImage would normally rotate if not pinned
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "newtab",
        },
      });
    });

    // Trigger nextImage via tab message
    const result = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(result).toEqual({ ok: true });

    // History should not have changed because pinned photo skips rotation
    const historyAfter = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceAssetId: string }> };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(historyAfter).toHaveLength(1);
    expect(historyAfter[0]!.sourceAssetId).toBe(
      historyBefore[0]!.sourceAssetId,
    );

    await tab.close();
  });

  test("frequency is respected: skips when fresh and rotates when expired", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    await setupMockPipeline();
    const worker = await getWorker();

    // Set photoFrequency to 'everyhour'
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "everyhour",
        },
      });
    });

    // Open tab with 1 fresh photo (createdAt = Date.now())
    const tab = await openNewTab({ photoCount: 1 });

    const historyInitial = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceAssetId: string }> };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(historyInitial).toHaveLength(1);
    const initialAssetId = historyInitial[0]!.sourceAssetId;

    // Trigger nextImage while photo is fresh (< 1 hour)
    const freshResult = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(freshResult).toEqual({ ok: true });

    // History should still only have the initial photo
    const historyFresh = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceAssetId: string }> };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(historyFresh).toHaveLength(1);
    expect(historyFresh[0]!.sourceAssetId).toBe(initialAssetId);

    // Age the photo so it's older than 1 hour (e.g. 2 hours old)
    await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ createdAt: number }> };
      };
      if (data.stellarHistory?.history?.[0]) {
        data.stellarHistory.history[0].createdAt =
          Date.now() - 2 * 60 * 60 * 1000;
        await chrome.storage.local.set({ stellarHistory: data.stellarHistory });
      }
    });

    // Trigger nextImage when expired
    const rotateResult = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(rotateResult).toEqual({ ok: true });

    // History should now have rotated (new photo prepended)
    const historyRotated = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceAssetId: string }> };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(historyRotated).toHaveLength(2);
    expect(historyRotated[0]!.sourceAssetId).not.toBe(initialAssetId);
    expect(historyRotated[1]!.sourceAssetId).toBe(initialAssetId);

    await tab.close();
  });

  test("failing source falls back to next active source", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    // Unsplash fails with 403, Smithsonian succeeds
    await setupMockPipeline({ unsplashFails: true });
    const worker = await getWorker();

    // Force shuffleSources to keep original order [unsplash, smithsonian]
    await worker.evaluate(async () => {
      // In shuffleSources, j = Math.floor(Math.random() * (i + 1)). When Math.random() >= 0.5 for i=1, j = 1, so indices are NOT swapped.
      Math.random = () => 0.99;
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash", "smithsonian"],
          photoFrequency: "everyhour",
        },
      });
    });

    const tab = await openNewTab({ photoCount: 1 });

    // Switch frequency to newtab to test rotation fallback
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash", "smithsonian"],
          photoFrequency: "newtab",
        },
      });
    });

    // Trigger rotation from open tab
    const result = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(result).toEqual({ ok: true });
    await tab.close();

    // The new photo must be from smithsonian because unsplash failed
    const history = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceId: string }> };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(history[0]!.sourceId).toBe("smithsonian");

    // Unsplash should be marked unhealthy in sourceHealth
    const healthMap = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("sourceHealth")) as {
        sourceHealth?: Record<string, string>;
      };
      return data.sourceHealth ?? {};
    });
    expect(healthMap.unsplash).toContain("Unsplash request failed (403)");
  });

  test("eviction at history limit deletes both image and thumbnail from cache", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    await setupMockPipeline();
    const worker = await getWorker();

    // Configure frequency to everyhour so opening tab doesn't rotate yet
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "everyhour",
        },
      });
    });

    // Open tab seeded with 10 photos (the HISTORY_LIMIT)
    const tab = await openNewTab({ photoCount: 10 });

    // Populate thumbnail cache for the 10th item (the one that will be evicted)
    const evictedCacheKey = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory: { history: Array<{ cacheKey: string }> };
      };
      const oldest = data.stellarHistory.history[9]!;

      const cache = await caches.open("stellar-photos-images-v1");
      const thumbKey = oldest.cacheKey.replace("/asset/", "/thumbnail/");
      await cache.put(
        thumbKey,
        new Response(new Blob(["thumb"], { type: "image/webp" }), {
          headers: { "Content-Type": "image/webp" },
        }),
      );

      return oldest.cacheKey;
    });

    // Verify both image and thumbnail exist before rotation
    const beforeExists = await worker.evaluate(async (key) => {
      const cache = await caches.open("stellar-photos-images-v1");
      const thumbKey = key.replace("/asset/", "/thumbnail/");
      const imgMatch = await cache.match(key);
      const thumbMatch = await cache.match(thumbKey);
      return { img: Boolean(imgMatch), thumb: Boolean(thumbMatch) };
    }, evictedCacheKey);
    expect(beforeExists).toEqual({ img: true, thumb: true });

    // Set frequency to 'newtab' to trigger rotation
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "newtab",
        },
      });
    });

    // Trigger rotation via tab
    const result = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(result).toEqual({ ok: true });
    await tab.close();

    // Verify history length is still capped at 10
    const history = await worker.evaluate(async () => {
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ cacheKey: string }> };
      };
      return data.stellarHistory?.history ?? [];
    });
    expect(history).toHaveLength(10);
    expect(
      history.some(
        (item: { cacheKey: string }) => item.cacheKey === evictedCacheKey,
      ),
    ).toBe(false);

    // Verify both caches had the evicted asset deleted
    const afterExists = await worker.evaluate(async (key) => {
      const cache = await caches.open("stellar-photos-images-v1");
      const thumbKey = key.replace("/asset/", "/thumbnail/");
      const imgMatch = await cache.match(key);
      const thumbMatch = await cache.match(thumbKey);
      return { img: Boolean(imgMatch), thumb: Boolean(thumbMatch) };
    }, evictedCacheKey);
    expect(afterExists).toEqual({ img: false, thumb: false });
  });

  test("queues batch and reuses items across rotations without extra API calls", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    await setupMockPipeline();
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

    const tab = await openNewTab({ photoCount: 1 });

    // Switch frequency to newtab and trigger rotation twice
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "newtab",
        },
      });
    });

    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    // Check Unsplash API call count and storage queue cursor
    const { apiCount, cursor } = await worker.evaluate(async () => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { unsplashCounter: number };
        }
      ).__mockPipelineState;
      const stored = (await chrome.storage.local.get(
        "sourceQueueCursor:unsplash",
      )) as {
        "sourceQueueCursor:unsplash"?: number;
      };
      return {
        apiCount: state?.unsplashCounter ?? 0,
        cursor: stored["sourceQueueCursor:unsplash"] ?? 0,
      };
    });

    // Only 1 API batch was requested; the 2 rotations consumed items from the queue
    expect(apiCount).toBe(1);
    expect(cursor).toBe(2);

    await tab.close();
  });

  test("invalidates queue when source settings change", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    await setupMockPipeline();
    const worker = await getWorker();

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["smithsonian"],
          photoFrequency: "everyhour",
        },
        "sourceSettings:smithsonian:category": "art_design",
      });
    });

    const tab = await openNewTab({ photoCount: 1 });

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["smithsonian"],
          photoFrequency: "newtab",
        },
      });
    });

    // Rotate once with category 'art_design'
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    const firstApiCount = await worker.evaluate(() => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { smithsonianCounter: number };
        }
      ).__mockPipelineState;
      return state?.smithsonianCounter ?? 0;
    });
    expect(firstApiCount).toBe(1);

    // Update Smithsonian category to 'science_technology'
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        "sourceSettings:smithsonian:category": "science_technology",
      });
    });

    // Rotate again: should detect changed category and fetch a new batch
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    const secondApiCount = await worker.evaluate(() => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { smithsonianCounter: number };
        }
      ).__mockPipelineState;
      return state?.smithsonianCounter ?? 0;
    });
    expect(secondApiCount).toBe(2);

    await tab.close();
  });

  test("skips broken image downloads and advances queue to next item", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    // First Unsplash candidate image fails (404), second succeeds
    await setupMockPipeline({
      failingImageUrls: ["unsplash-real-1-1"],
    });
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

    const tab = await openNewTab({ photoCount: 1 });

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "newtab",
        },
      });
    });

    // First rotation attempts candidate 1 (which throws download error in readBoundedImage)
    const firstTry = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    // First call fails because candidate 1 image download failed
    expect(firstTry.ok).toBe(false);

    // Second rotation serves candidate 2 from the same queue without refetching API
    const secondTry = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(secondTry.ok).toBe(true);

    const { apiCount, latestAssetId } = await worker.evaluate(async () => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { unsplashCounter: number };
        }
      ).__mockPipelineState;
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceAssetId: string }> };
      };
      return {
        apiCount: state?.unsplashCounter ?? 0,
        latestAssetId: data.stellarHistory?.history?.[0]?.sourceAssetId,
      };
    });

    expect(apiCount).toBe(1);
    expect(latestAssetId).toBe("unsplash-real-1-2");

    await tab.close();
  });

  test("Smithsonian reuses remaining rows across rotations without extra API calls", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    await setupMockPipeline();
    const worker = await getWorker();

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["smithsonian"],
          photoFrequency: "everyhour",
        },
      });
    });

    const tab = await openNewTab({
      photoCount: 1,
      sourceId: "smithsonian",
    });

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["smithsonian"],
          photoFrequency: "newtab",
        },
      });
    });

    // Rotate twice (both should draw from the Smithsonian 10-row batch)
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    const { apiCount, cursor } = await worker.evaluate(async () => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { smithsonianCounter: number };
        }
      ).__mockPipelineState;
      const stored = (await chrome.storage.local.get(
        "sourceQueueCursor:smithsonian",
      )) as {
        "sourceQueueCursor:smithsonian"?: number;
      };
      return {
        apiCount: state?.smithsonianCounter ?? 0,
        cursor: stored["sourceQueueCursor:smithsonian"] ?? 0,
      };
    });

    // 1 API fetch performed, cursor advanced to 2
    expect(apiCount).toBe(1);
    expect(cursor).toBe(2);

    await tab.close();
  });

  test("invalidates Unsplash queue when query/filter settings change", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    await setupMockPipeline();
    const worker = await getWorker();

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "everyhour",
        },
        "sourceSettings:unsplash": {
          version: 1,
          imageQuality: "standard",
          collections: "998309",
          topics: "",
          username: "",
          query: "mountains",
          orientation: "",
          contentFilter: "low",
        },
      });
    });

    const tab = await openNewTab({ photoCount: 1 });

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "newtab",
        },
      });
    });

    // Rotate with query 'mountains'
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    const firstApiCount = await worker.evaluate(() => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { unsplashCounter: number };
        }
      ).__mockPipelineState;
      return state?.unsplashCounter ?? 0;
    });
    expect(firstApiCount).toBe(1);

    // Update query to 'ocean'
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        "sourceSettings:unsplash": {
          version: 1,
          imageQuality: "standard",
          collections: "998309",
          topics: "",
          username: "",
          query: "ocean",
          orientation: "",
          contentFilter: "low",
        },
      });
    });

    // Rotate again: changed query produces a different endpoint URL, invalidating the queue
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    const secondApiCount = await worker.evaluate(() => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { unsplashCounter: number };
        }
      ).__mockPipelineState;
      return state?.unsplashCounter ?? 0;
    });
    expect(secondApiCount).toBe(2);

    await tab.close();
  });

  test("refills queue with a new batch after the current batch is exhausted", async ({
    getWorker,
    setupMockPipeline,
    openNewTab,
  }) => {
    // Configure small batch of 2 items
    await setupMockPipeline({ batchCount: 2 });
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

    const tab = await openNewTab({ photoCount: 1 });

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "newtab",
        },
      });
    });

    // Rotation 1: Fetches batch 1 (2 items), serves item 1. (cursor becomes 1)
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });
    // Rotation 2: Consumes item 2 from batch 1. (cursor becomes 2, queue exhausted)
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    const countsAfterBatch1 = await worker.evaluate(async () => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { unsplashCounter: number };
        }
      ).__mockPipelineState;
      const stored = (await chrome.storage.local.get(
        "sourceQueueCursor:unsplash",
      )) as {
        "sourceQueueCursor:unsplash"?: number;
      };
      return {
        apiCount: state?.unsplashCounter ?? 0,
        cursor: stored["sourceQueueCursor:unsplash"] ?? 0,
      };
    });
    expect(countsAfterBatch1.apiCount).toBe(1);
    expect(countsAfterBatch1.cursor).toBe(2);

    // Rotation 3: Queue is now exhausted (cursor >= items.length), must fetch batch 2
    await tab.evaluate(async () => {
      await chrome.runtime.sendMessage({ command: "nextImage" });
    });

    const countsAfterBatch2 = await worker.evaluate(async () => {
      const state = (
        globalThis as unknown as {
          __mockPipelineState?: { unsplashCounter: number };
        }
      ).__mockPipelineState;
      const stored = (await chrome.storage.local.get(
        "sourceQueueCursor:unsplash",
      )) as {
        "sourceQueueCursor:unsplash"?: number;
      };
      const data = (await chrome.storage.local.get("stellarHistory")) as {
        stellarHistory?: { history?: Array<{ sourceAssetId: string }> };
      };
      return {
        apiCount: state?.unsplashCounter ?? 0,
        cursor: stored["sourceQueueCursor:unsplash"] ?? 0,
        latestAssetId: data.stellarHistory?.history?.[0]?.sourceAssetId,
      };
    });

    expect(countsAfterBatch2.apiCount).toBe(2);
    expect(countsAfterBatch2.cursor).toBe(1);
    expect(countsAfterBatch2.latestAssetId).toBe("unsplash-real-2-1");

    await tab.close();
  });

  test("fresh photo + hourly frequency makes zero remote network requests on tab opening", async ({
    getWorker,
    context,
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

    const requests: string[] = [];
    context.on("request", (req) => {
      const url = req.url();
      if (!url.startsWith("chrome-extension://")) {
        requests.push(url);
      }
    });

    const tab = await openNewTab({ photoCount: 1 });
    await expect(
      tab.locator(".bottom-credit .photographer-name"),
    ).toBeVisible();

    expect(requests).toEqual([]);
    await tab.close();
  });

  test("pinned photo displays pinned image and makes zero API calls on new tab", async ({
    getWorker,
    context,
    extensionId,
    openNewTab,
  }) => {
    const worker = await getWorker();
    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash"],
          photoFrequency: "newtab",
        },
      });
    });

    const tab1 = await openNewTab({ photoCount: 1 });
    await tab1.mouse.move(100, 100);
    const pinBtn = tab1.getByRole("button", {
      name: "Pin this image",
      exact: true,
    });
    await pinBtn.click();
    await expect(
      tab1.getByRole("button", { name: "Unpin this image", exact: true }),
    ).toBeVisible();

    const apiCalls: string[] = [];
    context.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("api.unsplash.com") ||
        url.includes("api.si.edu") ||
        url.includes("prettyearth")
      ) {
        apiCalls.push(url);
      }
    });

    const tab2 = await context.newPage();
    await tab2.goto(`chrome-extension://${extensionId}/newtab.html`);
    await tab2.waitForLoadState("domcontentloaded");
    await tab2.mouse.move(100, 100);
    await expect(
      tab2.locator(".bottom-credit .photographer-name"),
    ).toBeVisible();
    await expect(
      tab2.getByRole("button", { name: "Unpin this image", exact: true }),
    ).toBeVisible();

    expect(apiCalls).toEqual([]);
    await tab1.close();
    await tab2.close();
  });

  test("real failures: 500, HTML content-type, and 25MB payload record in source health, fallback to next source, banner shows only when all fail", async ({
    getWorker,
    context,
    openNewTab,
  }) => {
    const worker = await getWorker();
    await worker.evaluate(async () => {
      Math.random = () => 0.99;
      await chrome.storage.sync.set({
        coreSettings: {
          version: 1,
          activeSourceIds: ["unsplash", "smithsonian", "earthview"],
          photoFrequency: "newtab",
        },
      });
    });

    await context.route("https://api.unsplash.com/**", async (route) => {
      await route.fulfill({
        status: 500,
        body: "Unsplash Internal Server Error",
      });
    });

    const tab = await openNewTab({ photoCount: 1 });

    await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });

    let health = await worker.evaluate(async () => {
      const { sourceHealth } = await chrome.storage.local.get("sourceHealth");
      return (sourceHealth as Record<string, string>) ?? {};
    });
    expect(health.unsplash).toContain("500");
    expect(health.smithsonian).toBeFalsy();
    await expect(tab.locator(".all-sources-down-banner")).toBeHidden();

    await context.route("https://ids.si.edu/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Not an image</body></html>",
      });
    });

    await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });

    health = await worker.evaluate(async () => {
      const { sourceHealth } = await chrome.storage.local.get("sourceHealth");
      return (sourceHealth as Record<string, string>) ?? {};
    });
    expect(health.unsplash).toBeTruthy();
    expect(health.smithsonian).toContain("Remote URL did not return an image");
    expect(health.earthview).toBeFalsy();
    await expect(tab.locator(".all-sources-down-banner")).toBeHidden();

    await context.route(
      "https://www.gstatic.com/prettyearth/assets/full/**",
      async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(25 * 1024 * 1024),
          },
          body: Buffer.alloc(100),
        });
      },
    );

    const res = await tab.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(res.ok).toBe(false);

    health = await worker.evaluate(async () => {
      const { sourceHealth } = await chrome.storage.local.get("sourceHealth");
      return (sourceHealth as Record<string, string>) ?? {};
    });
    expect(health.unsplash).toBeTruthy();
    expect(health.smithsonian).toBeTruthy();
    expect(health.earthview).toContain("Image exceeds 20 MiB limit");

    await expect(tab.locator(".all-sources-down-banner")).toBeVisible();
    await expect(tab.locator(".all-sources-down-banner")).toContainText(
      "Unable to retrieve new photos",
    );

    await tab.close();
  });

  test("recovers and rotates cleanly when service worker is stopped via CDP", async ({
    context,
    extensionId,
    openNewTab,
  }) => {
    const tab1 = await openNewTab({ photoCount: 1 });

    const cdp = await context.newCDPSession(tab1);
    await cdp.send("ServiceWorker.enable");
    await cdp.send("ServiceWorker.stopAllWorkers");

    const tab2 = await context.newPage();
    await tab2.goto(`chrome-extension://${extensionId}/newtab.html`);
    await tab2.waitForLoadState("domcontentloaded");
    await expect(
      tab2.locator(".bottom-credit .photographer-name"),
    ).toBeVisible();

    const rotateResult = await tab2.evaluate(async () => {
      return chrome.runtime.sendMessage({ command: "nextImage" });
    });
    expect(rotateResult).toEqual({ ok: true });

    await tab1.close();
    await tab2.close();
  });
});
