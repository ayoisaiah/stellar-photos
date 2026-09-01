import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsDrawer } from "../src/ts/components/settings-drawer";

vi.stubGlobal("chrome", {
  runtime: {
    lastError: undefined,
    getManifest: () => ({ version: "5.0.0" }),
  },
  storage: {
    sync: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
});

describe("SettingsDrawer component", () => {
  it("initializes with default active sources and frequency", () => {
    const drawer = new SettingsDrawer();
    expect(drawer.activeSourceIds).toEqual(["unsplash"]);
    expect(drawer.photoFrequency).toBe("newtab");
  });

  it("toggles source on and dispatches active-sources-changed", async () => {
    const drawer = new SettingsDrawer();
    drawer.activeSourceIds = ["unsplash"];
    drawer.open = true;

    const eventSpy = vi.fn();
    drawer.addEventListener("active-sources-changed", eventSpy);

    // @ts-expect-error accessing private method for testing
    await drawer.toggleSource("earthview");

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { sourceIds: ["unsplash", "earthview"] },
      }),
    );
  });

  it("prevents disabling the last remaining active source", async () => {
    const drawer = new SettingsDrawer();
    drawer.activeSourceIds = ["unsplash"];
    drawer.open = true;

    const eventSpy = vi.fn();
    drawer.addEventListener("active-sources-changed", eventSpy);

    // @ts-expect-error accessing private method for testing
    await drawer.toggleSource("unsplash");

    expect(eventSpy).not.toHaveBeenCalled();
  });

  it("toggles source expansion for configurable sources", () => {
    const drawer = new SettingsDrawer();
    expect(drawer["expandedSourceIds"].has("unsplash")).toBe(false);

    // @ts-expect-error accessing private method for testing
    drawer.toggleExpand("unsplash");
    expect(drawer["expandedSourceIds"].has("unsplash")).toBe(true);

    // @ts-expect-error accessing private method for testing
    drawer.toggleExpand("unsplash");
    expect(drawer["expandedSourceIds"].has("unsplash")).toBe(false);
  });

  it("dispatches frequency-changed event when frequency is changed", async () => {
    const drawer = new SettingsDrawer();
    drawer.photoFrequency = "newtab";

    const eventSpy = vi.fn();
    drawer.addEventListener("frequency-changed", eventSpy);

    const inputMock = { value: "everyhour" } as unknown as HTMLInputElement;
    const eventMock = { currentTarget: inputMock } as unknown as Event;

    // @ts-expect-error accessing private method for testing
    await drawer.changeFrequency(eventMock);

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { frequency: "everyhour" },
      }),
    );
  });
});
