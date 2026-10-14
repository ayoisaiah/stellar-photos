import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type BrowserContext,
  test as base,
  chromium,
  expect,
  type Page,
  type Route,
  type Worker,
} from "@playwright/test";

interface OpenTabOptions {
  orientation?: "landscape" | "portrait";
  photoCount?: number;
  seeded?: boolean;
  sourceId?: "unsplash" | "smithsonian" | "earthview";
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
  seedPhotos: typeof seedTestPhotos;
  setupMockPipeline: (options?: MockPipelineOptions) => Promise<void>;
}

type Evaluable = {
  evaluate: <R, Arg>(
    pageFunction: (arg: Arg) => R | Promise<R>,
    arg: Arg,
  ) => Promise<R>;
};

interface PipelineState extends MockPipelineOptions {
  unsplashCounter: number;
  smithsonianCounter: number;
}

const EXTENSION_PATH = resolve(".wxt-e2e-dist/chrome");
const LANDSCAPE_JPEG = readFileSync(resolve("e2e/fixtures/landscape.jpg"));
const PORTRAIT_JPEG = readFileSync(resolve("e2e/fixtures/portrait.jpg"));
const REAL_LANDSCAPE_BASE64 = LANDSCAPE_JPEG.toString("base64");
const REAL_PORTRAIT_BASE64 = PORTRAIT_JPEG.toString("base64");
const RECORDED_UNSPLASH = JSON.parse(
  readFileSync(resolve("e2e/fixtures/unsplash-photos.json"), "utf8"),
) as Array<Record<string, unknown>>;
const RECORDED_SMITHSONIAN = JSON.parse(
  readFileSync(resolve("e2e/fixtures/smithsonian-search.json"), "utf8"),
) as { response?: { rows?: Array<Record<string, unknown>> } };
const RECORDED_EARTHVIEW = JSON.parse(
  readFileSync(resolve("e2e/fixtures/earthview-details.json"), "utf8"),
) as Record<string, unknown>;

async function syncWorkerState(
  workerGetter: () => Promise<Worker | undefined>,
  state: PipelineState,
): Promise<void> {
  const worker = await workerGetter();
  if (!worker) {
    return;
  }

  await worker
    .evaluate((s) => {
      (
        globalThis as unknown as { __mockPipelineState: typeof s }
      ).__mockPipelineState = { ...s };
    }, state)
    .catch(() => {
      // Ignore errors if worker is restarting or unavailable
    });
}

async function registerContextRoutes(
  context: BrowserContext,
  state: PipelineState,
  workerGetter: () => Promise<Worker | undefined>,
): Promise<void> {
  await context.route(
    "https://api.unsplash.com/photos/**/download**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://images.unsplash.com/download-fallback",
        }),
      });
    },
  );

  await context.route(
    "https://api.unsplash.com/photos/random**",
    async (route) => {
      if (state.unsplashFails) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ errors: ["Unsplash rate limited"] }),
        });
        return;
      }

      state.unsplashCounter += 1;
      await syncWorkerState(workerGetter, state);

      const count = state.batchCount ?? 30;
      const basePhotos = RECORDED_UNSPLASH.slice(0, count);
      const photos = basePhotos.map((item, index) => {
        const id = `unsplash-real-${state.unsplashCounter}-${index + 1}`;
        const isPortrait =
          typeof item.width === "number" &&
          typeof item.height === "number" &&
          item.height > item.width;
        const imageUrl = isPortrait
          ? `https://images.unsplash.com/${id}?portrait`
          : `https://images.unsplash.com/${id}`;

        return {
          ...item,
          id,
          urls: {
            raw: imageUrl,
            full: `${imageUrl}${isPortrait ? "&" : "?"}full`,
            regular: `${imageUrl}${isPortrait ? "&" : "?"}regular`,
            small: `${imageUrl}${isPortrait ? "&" : "?"}small`,
            thumb: `${imageUrl}${isPortrait ? "&" : "?"}thumb`,
          },
          links: {
            html: `https://unsplash.com/photos/${id}`,
            download: `https://unsplash.com/photos/${id}/download`,
            download_location: `https://api.unsplash.com/photos/${id}/download`,
          },
        };
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(photos),
      });
    },
  );

  await context.route(
    "https://api.unsplash.com/collections/**",
    async (route) => {
      const url = new URL(route.request().url());
      const id = url.pathname.split("/").pop() ?? "test-collection";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id,
          title: `Collection ${id}`,
          total_photos: 100,
        }),
      });
    },
  );

  await context.route("https://api.unsplash.com/topics/**", async (route) => {
    const url = new URL(route.request().url());
    const slug = url.pathname.split("/").pop() ?? "test-topic";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: slug,
        slug,
        title: `Topic ${slug}`,
        total_photos: 100,
      }),
    });
  });

  const handleImage = async (route: Route) => {
    const url = route.request().url();

    if (
      state.imageFails ||
      (state.failingImageUrls &&
        state.failingImageUrls.some((pattern) => url.includes(pattern)))
    ) {
      await route.fulfill({
        status: 404,
        body: "Image download failed",
      });
      return;
    }

    const isPortrait = url.includes("portrait");

    await route.fulfill({
      status: 200,
      contentType: "image/jpeg",
      body: isPortrait ? PORTRAIT_JPEG : LANDSCAPE_JPEG,
    });
  };

  await context.route("https://images.unsplash.com/**", handleImage);
  await context.route("https://ids.si.edu/**", handleImage);
  await context.route(
    "https://www.gstatic.com/prettyearth/assets/full/**",
    handleImage,
  );
  await context.route("https://images.example.com/**", handleImage);

  await context.route(
    "https://api.si.edu/openaccess/api/v1.0/**",
    async (route) => {
      if (state.smithsonianFails) {
        await route.fulfill({
          status: 500,
          body: "Smithsonian API error",
        });
        return;
      }

      state.smithsonianCounter += 1;
      await syncWorkerState(workerGetter, state);

      const count = state.smithsonianBatchCount ?? 10;
      const baseRows = RECORDED_SMITHSONIAN.response?.rows ?? [];
      const rows = baseRows.slice(0, count).map((item, index) => {
        const id = `smithsonian-real-${state.smithsonianCounter}-${index + 1}`;
        const itemMedia = (
          item as {
            content?: {
              descriptiveNonRepeating?: {
                online_media?: {
                  media?: Array<{
                    resources?: Array<{ width?: number; height?: number }>;
                  }>;
                };
              };
            };
          }
        ).content?.descriptiveNonRepeating?.online_media?.media?.[0];
        const resource = itemMedia?.resources?.[0];
        const width = resource?.width ?? 2000;
        const height = resource?.height ?? 1333;
        const isPortrait = height > width;
        const imageUrl = isPortrait
          ? `https://ids.si.edu/${id}-portrait.jpg`
          : `https://ids.si.edu/${id}.jpg`;

        return {
          ...item,
          id,
          content: {
            descriptiveNonRepeating: {
              record_link: `https://www.si.edu/object/${id}`,
              online_media: {
                media: [
                  {
                    type: "Images",
                    usage: { access: "CC0" },
                    content: imageUrl,
                    resources: [{ width, height }],
                  },
                ],
              },
            },
          },
        };
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ response: { rows } }),
      });
    },
  );

  await context.route("**/prettyearth/assets/data/**", async (route) => {
    if (state.earthviewFails) {
      await route.fulfill({
        status: 500,
        body: "Earthview API error",
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(RECORDED_EARTHVIEW),
    });
  });
}

async function seedTestPhotos(
  target: Evaluable,
  count = 1,
  orientation: "landscape" | "portrait" = "landscape",
  sourceId: "unsplash" | "smithsonian" | "earthview" = "unsplash",
): Promise<void> {
  const isPortrait = orientation === "portrait";
  const width = isPortrait ? 1333 : 2000;
  const height = isPortrait ? 2000 : 1333;
  const imageBase64 = isPortrait ? REAL_PORTRAIT_BASE64 : REAL_LANDSCAPE_BASE64;

  await target.evaluate(
    async ({
      photoCount,
      imageBase64,
      isPortrait,
      width,
      height,
      sourceId,
    }) => {
      const assets = Array.from({ length: photoCount }, (_, i) => {
        if (sourceId === "earthview") {
          const id = 1003 + i;
          return {
            sourceId: "earthview",
            sourceAssetId: String(id),
            cacheKey: `https://cache.stellar-photos.invalid/asset/earthview/${id}`,
            width,
            height,
            color: "#333333",
            description: "Earth",
            attribution: {
              name: "Google Earth View",
              url: "https://earth.google.com/",
              sourceUrl: "https://earth.google.com/",
            },
            payloadVersion: 1,
            sourcePayload: { id },
            createdAt: Date.now() + i * 1000,
          };
        }

        if (sourceId === "smithsonian") {
          const id = `smithsonian-test-${i + 1}`;
          return {
            sourceId: "smithsonian",
            sourceAssetId: id,
            cacheKey: `https://cache.stellar-photos.invalid/asset/smithsonian/${id}`,
            width,
            height,
            color: "#333333",
            description: `Smithsonian Work ${i + 1}`,
            attribution: {
              name: "Smithsonian Open Access",
              url: "https://www.si.edu/openaccess",
              sourceUrl: `https://www.si.edu/object/${id}`,
            },
            payloadVersion: 1,
            sourcePayload: {
              imageUrl: `https://ids.si.edu/${id}.jpg`,
            },
            createdAt: Date.now() + i * 1000,
          };
        }

        return {
          sourceId: "unsplash",
          sourceAssetId: `test-photo-${i + 1}`,
          cacheKey: `https://cache.stellar-photos.invalid/asset/unsplash/test-photo-${i + 1}`,
          width,
          height,
          color: isPortrait ? "#134e5e" : "#333333",
          description: `Photo description ${i + 1}`,
          attribution: {
            name: `Photographer ${i + 1}`,
            url: `https://unsplash.com/@photographer${i + 1}`,
            sourceUrl: `https://unsplash.com/photos/test-photo-${i + 1}`,
          },
          payloadVersion: 1,
          sourcePayload: {
            downloadLocation: `https://api.unsplash.com/photos/test-photo-${i + 1}/download`,
            imageUrl: `https://images.unsplash.com/photo-test-${i + 1}${isPortrait ? "?portrait" : ""}`,
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
        };
      });

      await chrome.storage.local.set({
        stellarHistory: { version: 1, history: assets },
      });

      const cache = await caches.open("stellar-photos-images-v1");
      const binary = atob(imageBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/jpeg" });

      for (const asset of assets) {
        await cache.put(
          asset.cacheKey,
          new Response(blob, {
            headers: { "Content-Type": "image/jpeg" },
          }),
        );
        await cache.put(
          asset.cacheKey.replace("/asset/", "/thumbnail/"),
          new Response(blob, {
            headers: { "Content-Type": "image/jpeg" },
          }),
        );
      }
    },
    { photoCount: count, imageBase64, isPortrait, width, height, sourceId },
  );
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

    const pipelineState: PipelineState = {
      unsplashCounter: 0,
      smithsonianCounter: 0,
    };
    (context as unknown as { __pipelineState: PipelineState }).__pipelineState =
      pipelineState;

    const workerGetter = async () => {
      return (
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"))
      );
    };

    await registerContextRoutes(context, pipelineState, workerGetter);

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
      const state = (context as unknown as { __pipelineState: PipelineState })
        .__pipelineState;
      Object.assign(state, {
        unsplashCounter: 0,
        smithsonianCounter: 0,
        ...options,
      });

      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));

      await syncWorkerState(async () => worker, state);
    });
  },

  openNewTab: async ({ context, extensionId }, use) => {
    await use(async (options: OpenTabOptions = { seeded: true }) => {
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));

      if (options.seeded !== false) {
        await seedTestPhotos(
          worker,
          options.photoCount ?? 1,
          options.orientation ?? "landscape",
          options.sourceId ?? "unsplash",
        );
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
