import { beforeEach, describe, expect, it, vi } from "vitest";

const localStore: Record<string, unknown> = {};
const syncStore: Record<string, unknown> = {};

vi.stubGlobal("window", { clearTimeout, setTimeout });
vi.stubGlobal("__UNSPLASH_ACCESS_KEY__", "bundled-key");
vi.stubGlobal("chrome", {
  runtime: {
    lastError: undefined,
    getManifest: () => ({ version: "5.0.0" }),
  },
  storage: {
    sync: {
      get: (_keys: unknown) => Promise.resolve(syncStore),
      set: (data: Record<string, unknown>) => {
        Object.assign(syncStore, data);
        return Promise.resolve();
      },
    },
    local: {
      get: (_keys: unknown) => Promise.resolve(localStore),
      set: (data: Record<string, unknown>) => {
        Object.assign(localStore, data);
        return Promise.resolve();
      },
    },
  },
});

const { UNSPLASH_SETTINGS_KEY } = await import(
  "../src/ts/sources/unsplash-settings"
);
const { UnsplashSettings } = await import(
  "../src/ts/components/unsplash-settings"
);

describe("UnsplashSettings component access key validation", () => {
  beforeEach(() => {
    for (const key of Object.keys(localStore)) {
      delete localStore[key];
    }
    for (const key of Object.keys(syncStore)) {
      delete syncStore[key];
    }
    vi.restoreAllMocks();
  });

  it("pings Unsplash before saving a valid key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "test-photo" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const el = new UnsplashSettings();
    const input = { value: "valid-user-key" } as HTMLInputElement;
    const event = { currentTarget: input } as unknown as Event;

    // @ts-expect-error accessing private method for testing
    await el.saveAccessKey(event);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "https://api.unsplash.com/photos?per_page=1",
      }),
      expect.objectContaining({
        headers: {
          Authorization: "Client-ID valid-user-key",
          "Accept-Version": "v1",
        },
      }),
    );
    expect(localStore[UNSPLASH_SETTINGS_KEY]).toEqual({
      version: 1,
      accessKeyOverride: "valid-user-key",
    });
    // @ts-expect-error accessing private property for testing
    expect(el.accessKeyError).toBe("");
    // @ts-expect-error accessing private property for testing
    expect(el.saveState).toBe("saved");
  });

  it("does not save the key if the test ping fails with 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: ["Invalid key"] }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const el = new UnsplashSettings();
    const input = { value: "invalid-user-key" } as HTMLInputElement;
    const event = { currentTarget: input } as unknown as Event;

    // @ts-expect-error accessing private method for testing
    await el.saveAccessKey(event);

    expect(fetchMock).toHaveBeenCalled();
    expect(localStore[UNSPLASH_SETTINGS_KEY]).toBeUndefined();
    // @ts-expect-error accessing private property for testing
    expect(el.accessKeyError).toBe("Invalid Unsplash access key.");
    // @ts-expect-error accessing private property for testing
    expect(el.saveState).toBe("error");
  });

  it("clears access key without pinging when empty string is entered", async () => {
    localStore[UNSPLASH_SETTINGS_KEY] = {
      version: 1,
      accessKeyOverride: "existing-key",
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const el = new UnsplashSettings();
    // @ts-expect-error accessing private method for testing
    await el.load();

    const input = { value: "   " } as HTMLInputElement;
    const event = { currentTarget: input } as unknown as Event;

    // @ts-expect-error accessing private method for testing
    await el.saveAccessKey(event);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStore[UNSPLASH_SETTINGS_KEY]).toEqual({
      version: 1,
      accessKeyOverride: "",
    });
    // @ts-expect-error accessing private property for testing
    expect(el.accessKeyError).toBe("");
    // @ts-expect-error accessing private property for testing
    expect(el.saveState).toBe("saved");
  });

  it("clears the error state when the user types in the input", () => {
    const el = new UnsplashSettings();

    // @ts-expect-error setting private properties for testing
    el.accessKeyError = "Invalid Unsplash access key.";
    // @ts-expect-error setting private properties for testing
    el.saveState = "error";

    const input = { value: "new-input" } as HTMLInputElement;
    const event = { currentTarget: input } as unknown as Event;

    // @ts-expect-error accessing private method for testing
    el.updateAccessKey(event);

    // @ts-expect-error accessing private property for testing
    expect(el.accessKeyError).toBe("");
    // @ts-expect-error accessing private property for testing
    expect(el.saveState).toBe("idle");
    // @ts-expect-error accessing private property for testing
    expect(el.customAccessKey).toBe("new-input");
  });
});
