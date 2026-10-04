import { resolve } from "node:path";
import {
  type BrowserContext,
  test as base,
  chromium,
  expect,
  type Page,
  type Worker,
} from "@playwright/test";

interface OpenTabOptions {
  photoCount?: number;
  seeded?: boolean;
}

interface ExtensionFixtures {
  extensionId: string;
  openNewTab: (options?: OpenTabOptions) => Promise<Page>;
  seedPhotos: (target: Page | Worker, count?: number) => Promise<void>;
}

const EXTENSION_PATH = resolve(".wxt-e2e-dist/chrome");

type Evaluable = {
  evaluate: <R, Arg>(
    pageFunction: (arg: Arg) => R | Promise<R>,
    arg: Arg,
  ) => Promise<R>;
};

async function seedTestPhotos(target: Evaluable, count = 1): Promise<void> {
  await target.evaluate(async (photoCount) => {
    const assets = Array.from({ length: photoCount }, (_, i) => ({
      sourceId: "unsplash",
      sourceAssetId: `test-photo-${i + 1}`,
      cacheKey: `https://cache.stellar-photos.invalid/asset/unsplash/test-photo-${i + 1}`,
      width: 1920,
      height: 1080,
      color: "#333333",
      description: `Photo description ${i + 1}`,
      attribution: {
        name: `Photographer ${i + 1}`,
        url: `https://unsplash.com/@photographer${i + 1}`,
        sourceUrl: `https://unsplash.com/photos/test-photo-${i + 1}`,
      },
      payloadVersion: 1,
      sourcePayload: {
        downloadLocation: `https://api.unsplash.com/photos/test-photo-${i + 1}/download`,
        imageUrl: `https://images.unsplash.com/photo-test-${i + 1}`,
        info: {
          user: {
            name: `Photographer ${i + 1}`,
            username: `photographer${i + 1}`,
            profileImage: null,
            link: `https://unsplash.com/@photographer${i + 1}`,
          },
          location: {
            name: "Test Location",
            city: "Test City",
            country: "Test Country",
          },
          exif: {
            make: "Camera",
            model: "Model 1",
            exposureTime: "1/500",
            aperture: "2.8",
            focalLength: "50",
            iso: 100,
          },
          views: 1000,
          description: `Photo description ${i + 1}`,
        },
      },
      createdAt: Date.now() + i * 1000,
    }));

    await chrome.storage.local.set({
      stellarHistory: { version: 1, history: assets },
    });

    const cache = await caches.open("stellar-photos-images-v1");
    const pngBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const res = await fetch(pngBase64);
    const blob = await res.blob();

    for (const asset of assets) {
      await cache.put(
        asset.cacheKey,
        new Response(blob, {
          headers: { "Content-Type": "image/png" },
        }),
      );
    }
  }, count);
}

const test = base.extend<ExtensionFixtures>({
  context: async ({ headless }, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    // Intercept any page network requests to remote APIs
    await context.route("https://api.unsplash.com/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "mock-photo" }]),
      });
    });

    try {
      await use(context);
    } finally {
      await context.close();
    }
  },

  extensionId: async ({ context }, use) => {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));

    // Intercept background service worker network requests to remote APIs
    await worker.evaluate(() => {
      const orig = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.includes("api.unsplash.com")) {
          return new Response(JSON.stringify({ errors: ["Offline mock"] }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        return orig(input, init);
      };
    });

    const id = new URL(worker.url()).host;
    await use(id);
  },

  seedPhotos: async ({ context: _context }, use) => {
    await use(seedTestPhotos);
  },

  openNewTab: async ({ context, extensionId }, use) => {
    await use(async (options: OpenTabOptions = { seeded: true }) => {
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));

      if (options.seeded !== false) {
        await seedTestPhotos(worker, options.photoCount ?? 1);
      } else {
        await worker.evaluate(async () => {
          await chrome.storage.local.remove([
            "stellarHistory",
            "stellarPinned",
          ]);
        });
      }

      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/newtab.html`);
      await page.waitForLoadState("domcontentloaded");

      await page.mouse.move(100, 100);
      return page;
    });
  },
});

export { expect, test };
