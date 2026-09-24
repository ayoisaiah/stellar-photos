import { afterEach, expect, it, vi } from "vitest";
import { StellarApp } from "../src/ts/components/stellar-app";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("switches panels exclusively, refreshes on opening, and restores focus on closing", async () => {
  vi.stubGlobal("window", { clearTimeout, setTimeout });
  const app = new StellarApp();
  const history = vi.fn(async () => undefined);
  const settings = vi.fn(async () => undefined);
  const showControls = vi.fn();
  app["loadHistoryAssets"] = history;
  app["loadCoreSettings"] = settings;
  app["showControls"] = showControls;
  const focus = vi.fn();
  const querySelector = vi.fn(() => ({ focus }));
  Object.defineProperty(app, "renderRoot", { value: { querySelector } });
  Object.defineProperty(app, "updateComplete", {
    value: Promise.resolve(true),
  });

  expect(app["openPanel"]).toBeNull();
  expect(app["controlsLocked"]).toBe(false);

  for (const from of ["history", "info", "settings"] as const) {
    for (const to of ["history", "info", "settings"] as const) {
      app["openPanel"] = null;
      app["togglePanel"](from);
      app["togglePanel"](to);
      expect(app["openPanel"]).toBe(from === to ? null : to);
      expect(app["controlsLocked"]).toBe(from !== to);
      await Promise.resolve();
    }
  }

  history.mockClear();
  settings.mockClear();
  for (const panel of ["history", "info", "settings"] as const) {
    app["openPanel"] = null;
    app["togglePanel"](panel);
    querySelector.mockClear();
    showControls.mockClear();
    app["closePanel"]();
    app["closePanel"]();
    await Promise.resolve();

    expect(app["openPanel"]).toBeNull();
    expect(showControls).toHaveBeenCalledOnce();
    if (panel === "history") {
      expect(querySelector).not.toHaveBeenCalled();
    } else {
      expect(querySelector).toHaveBeenCalledWith(
        panel === "info" ? ".info-button" : ".settings-toggle",
      );
      expect(focus).toHaveBeenCalled();
    }
  }
  expect(history).toHaveBeenCalledOnce();
  expect(settings).toHaveBeenCalledOnce();
});
