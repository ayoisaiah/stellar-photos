import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getExtensionVersion,
  getWebstoreReviewUrl,
} from "../src/ts/components/settings-drawer";
import {
  readFrequency,
  statusMessage,
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
    expect(statusMessage("saving")).toBe("Saving…");
    expect(statusMessage("saved")).toBe("Saved");
    expect(statusMessage("error")).toBe("Couldn’t save this setting.");
    expect(statusMessage("idle")).toBe("");
  });

  it("reads extension version from manifest with fallback", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: () => ({ version: "5.0.0" }),
      },
    });

    expect(getExtensionVersion()).toBe("5.0.0");
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
