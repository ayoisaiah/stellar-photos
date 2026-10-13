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

interface MockPipelineOptions {
  unsplashFails?: boolean;
  smithsonianFails?: boolean;
  earthviewFails?: boolean;
  imageFails?: boolean;
  failingImageUrls?: string[];
  batchCount?: number;
  smithsonianBatchCount?: number;
}

interface ExtensionFixtures {
  extensionId: string;
  getWorker: () => Promise<Worker>;
  openNewTab: (options?: OpenTabOptions) => Promise<Page>;
  seedPhotos: (target: Page | Worker, count?: number) => Promise<void>;
  setupMockPipeline: (options?: MockPipelineOptions) => Promise<void>;
}

const EXTENSION_PATH = resolve(".wxt-e2e-dist/chrome");

type Evaluable = {
  evaluate: <R, Arg>(
    pageFunction: (arg: Arg) => R | Promise<R>,
    arg: Arg,
  ) => Promise<R>;
};

async function setupWorkerPipeline(
  worker: Worker,
  options: MockPipelineOptions = {},
): Promise<void> {
  await worker.evaluate((opts) => {
    const REAL_JPEG_BASE64 =
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const binary = atob(REAL_JPEG_BASE64);
    const jpegBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      jpegBytes[i] = binary.charCodeAt(i);
    }

    const state = {
      unsplashCounter: 0,
      smithsonianCounter: 0,
      ...opts,
    };
    (
      globalThis as unknown as { __mockPipelineState: typeof state }
    ).__mockPipelineState = state;

    const nativeFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.startsWith("data:")) {
        return nativeFetch(input, init);
      }

      if (
        url.includes("images.unsplash.com") ||
        url.includes("ids.si.edu") ||
        url.includes("prettyearth/assets/full") ||
        url.includes("example.com")
      ) {
        if (
          state.imageFails ||
          (state.failingImageUrls &&
            state.failingImageUrls.some((pattern: string) =>
              url.includes(pattern),
            ))
        ) {
          return new Response("Image download failed", { status: 404 });
        }
        return new Response(jpegBytes, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }

      if (url.includes("api.unsplash.com")) {
        if (url.includes("/download")) {
          return new Response("{}", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (state.unsplashFails) {
          return new Response(
            JSON.stringify({ errors: ["Unsplash rate limited"] }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        state.unsplashCounter++;
        const count = state.batchCount ?? 30;
        const photos = Array.from({ length: count }, (_, i) => {
          const id = `unsplash-real-${state.unsplashCounter}-${i + 1}`;
          return {
            id,
            width: 1920,
            height: 1080,
            color: "#123456",
            description: `Real photo ${id}`,
            alt_description: `Alt for ${id}`,
            urls: {
              raw: `https://images.unsplash.com/${id}`,
              full: `https://images.unsplash.com/${id}?full`,
            },
            links: {
              html: `https://unsplash.com/photos/${id}`,
              download_location: `https://api.unsplash.com/photos/${id}/download`,
            },
            user: {
              name: `Photographer ${id}`,
              username: `user_${id}`,
              links: { html: `https://unsplash.com/@user_${id}` },
            },
          };
        });

        return new Response(JSON.stringify(photos), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("api.si.edu")) {
        if (state.smithsonianFails) {
          return new Response("Smithsonian API error", { status: 500 });
        }
        state.smithsonianCounter++;
        const count = state.smithsonianBatchCount ?? 10;
        const rows = Array.from({ length: count }, (_, i) => {
          const id = `smithsonian-real-${state.smithsonianCounter}-${i + 1}`;
          return {
            id,
            title: `Artifact ${id}`,
            url: `https://www.si.edu/object/${id}`,
            content: {
              descriptiveNonRepeating: {
                record_link: `https://www.si.edu/object/${id}`,
                online_media: {
                  media: [
                    {
                      type: "Images",
                      usage: { access: "CC0" },
                      content: `https://ids.si.edu/${id}.jpg`,
                      resources: [{ width: 1920, height: 1080 }],
                    },
                  ],
                },
              },
            },
          };
        });

        return new Response(JSON.stringify({ response: { rows } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("prettyearth/assets/data")) {
        return new Response(
          JSON.stringify({ id: "1003", lat: 0, lng: 0, zoom: 5 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    };
  }, options);
}

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
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const binary = atob(pngBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/png" });

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

  getWorker: async ({ context }, use) => {
    await use(async () => {
      return (
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"))
      );
    });
  },

  seedPhotos: async ({ context: _context }, use) => {
    await use(seedTestPhotos);
  },

  setupMockPipeline: async ({ context }, use) => {
    await use(async (options: MockPipelineOptions = {}) => {
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));

      await setupWorkerPipeline(worker, options);
    });
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

export { expect, type MockPipelineOptions, test };
