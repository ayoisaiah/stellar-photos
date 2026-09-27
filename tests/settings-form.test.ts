import { afterEach, describe, expect, it, vi } from "vitest";

import { getWebstoreReviewUrl } from "../src/ts/components/settings-drawer";
import {
  readFrequency,
  SaveStatusController,
} from "../src/ts/components/settings-form";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("settings form", () => {
  it("accepts only supported frequencies", () => {
    const event = (value: string) =>
      ({ currentTarget: { value } }) as unknown as Event;

    expect(readFrequency(event("everyhour"))).toBe("everyhour");
    expect(readFrequency(event("sometimes"))).toBeUndefined();
  });

  it("formats save states", () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const controller = new SaveStatusController({
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    });

    for (const [state, message] of [
      ["saving", "Saving…"],
      ["saved", "Saved"],
      ["error", "Couldn’t save this setting."],
      ["idle", ""],
    ] as const) {
      controller.set(state);
      expect(controller.message).toBe(message);
    }

    controller.hostDisconnected();
  });

  it("resolves dynamic webstore review URLs by browser", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
    });
    expect(getWebstoreReviewUrl()).toContain("addons.mozilla.org");

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    });
    expect(getWebstoreReviewUrl()).toContain("microsoftedge.microsoft.com");

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(getWebstoreReviewUrl()).toContain("chromewebstore.google.com");
  });
});
