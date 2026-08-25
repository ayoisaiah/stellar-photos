import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_CACHE_NAME } from "../src/ts/cache";
import { reconcileHistory } from "../src/ts/history";

const local: Record<string, unknown> = {};
const entries = new Map<string, Response>();
let rejectCanonicalPut = false;

beforeEach(() => {
  for (const key of Object.keys(local)) delete local[key];
  entries.clear();
  rejectCanonicalPut = false;

  vi.stubGlobal("chrome", {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get: (_keys: unknown, callback: (value: unknown) => void) =>
          callback({ ...local }),
        set: (data: Record<string, unknown>, callback: () => void) => {
          Object.assign(local, data);
          callback();
        },
        remove: (keys: string | string[], callback: () => void) => {
          for (const key of Array.isArray(keys) ? keys : [keys])
            delete local[key];
          callback();
        },
      },
    },
  });
  vi.stubGlobal("caches", {
    open: async () => imageCache,
    keys: async () => [ACTIVE_CACHE_NAME],
    delete: async () => true,
  });
});

describe("history cache migration", () => {
  it("preserves a legacy cached image under its source-qualified key", async () => {
    const legacyKey = "https://cache.stellar-photos.invalid/photo/photo-1";
    const canonicalKey =
      "https://cache.stellar-photos.invalid/asset/unsplash/photo-1";

    local.stellarHistory = {
      version: 1,
      history: [legacyMetadata(legacyKey)],
    };
    entries.set(
      legacyKey,
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const state = await reconcileHistory();

    expect(state.history[0]?.cacheKey).toBe(canonicalKey);
    expect(entries.has(canonicalKey)).toBe(true);
    expect(entries.has(legacyKey)).toBe(false);
    expect(local.stellarHistory).toEqual(state);
  });

  it("keeps the legacy key when copying the cached image fails", async () => {
    const legacyKey = "https://cache.stellar-photos.invalid/photo/photo-1";

    local.stellarHistory = {
      version: 1,
      history: [legacyMetadata(legacyKey)],
    };
    entries.set(
      legacyKey,
      new Response(new Uint8Array([1]), {
        headers: { "content-type": "image/jpeg" },
      }),
    );
    rejectCanonicalPut = true;

    const state = await reconcileHistory();

    expect(state.history[0]?.cacheKey).toBe(legacyKey);
    expect(entries.has(legacyKey)).toBe(true);
  });
});

const imageCache = {
  async match(request: RequestInfo | URL) {
    return entries.get(requestUrl(request))?.clone();
  },
  async put(request: RequestInfo | URL, response: Response) {
    if (rejectCanonicalPut && requestUrl(request).includes("/asset/"))
      throw new Error("Cache is full");

    entries.set(requestUrl(request), response.clone());
  },
  async delete(request: RequestInfo | URL) {
    return entries.delete(requestUrl(request));
  },
  async keys() {
    return [...entries.keys()].map((url) => new Request(url));
  },
} as unknown as Cache;

function requestUrl(request: RequestInfo | URL): string {
  if (typeof request === "string") return request;

  return request instanceof URL ? request.href : request.url;
}

function legacyMetadata(cacheKey: string) {
  return {
    id: "photo-1",
    cacheKey,
    width: 1600,
    height: 900,
    color: "#123456",
    description: "A mountain",
    photographerName: "Ada",
    photographerUrl: "https://unsplash.com/@ada",
    unsplashUrl: "https://unsplash.com/photos/photo-1",
    downloadLocation: "https://api.unsplash.com/photos/photo-1/download",
    createdAt: 1,
  };
}
