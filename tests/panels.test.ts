import { afterEach, expect, it, vi } from "vitest";
import { StellarApp } from "../src/ts/components/stellar-app";

afterEach(() => {
  vi.useRealTimers();
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

  for (const from of ["info", "settings"] as const) {
    for (const to of ["info", "settings"] as const) {
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
  for (const panel of ["info", "settings"] as const) {
    app["openPanel"] = null;
    app["togglePanel"](panel);
    querySelector.mockClear();
    showControls.mockClear();
    app["closePanel"]();
    app["closePanel"]();
    await Promise.resolve();

    expect(app["openPanel"]).toBeNull();
    expect(showControls).toHaveBeenCalledOnce();
    expect(querySelector).toHaveBeenCalledWith(
      panel === "info" ? ".info-button" : ".settings-toggle",
    );
    expect(focus).toHaveBeenCalled();
  }
  expect(history).not.toHaveBeenCalled();
  expect(settings).toHaveBeenCalledOnce();
});

it("keeps history wheel navigation separate from passive window gestures", () => {
  const app = new StellarApp();
  app["loadHistoryAssets"] = vi.fn(async () => undefined);
  app["showControls"] = vi.fn();
  const navigate = vi.fn(async () => undefined);
  app["navigateHistory"] = navigate;
  vi.spyOn(Date, "now").mockReturnValue(1000);
  const wheel = (deltaY: number) =>
    Object.assign(new Event("wheel", { cancelable: true }), {
      deltaX: 0,
      deltaY,
    }) as WheelEvent;

  const open = wheel(-40);
  app["handleWheel"](open);
  expect(app["historyOpen"]).toBe(true);
  expect(open.defaultPrevented).toBe(false);

  const scroll = wheel(40);
  app["handleHistoryWheel"](scroll);
  app["handleWheel"](scroll);
  expect(scroll.defaultPrevented).toBe(true);
  expect(navigate).toHaveBeenCalledExactlyOnceWith(1);
  expect(app["historyOpen"]).toBe(true);
  app["handleHistoryWheel"](wheel(40));
  expect(navigate).toHaveBeenCalledOnce();

  vi.mocked(Date.now).mockReturnValue(1300);
  app["handleHistoryWheel"](wheel(-40));
  expect(navigate).toHaveBeenLastCalledWith(-1);

  const close = wheel(40);
  app["handleWheel"](close);
  expect(app["openPanel"]).toBeNull();
  expect(app["historyOpen"]).toBe(false);
  expect(close.defaultPrevented).toBe(false);

  for (const panel of ["settings", "info"] as const) {
    app["openPanel"] = panel;
    app["historyOpen"] = true;
    const event = wheel(-40);
    app["handleHistoryWheel"](event);
    app["handleWheel"](event);
    expect(event.defaultPrevented).toBe(false);
    expect(app["openPanel"]).toBe(panel);
  }
});

it.each([true, false])(
  "reads history on demand only without storage notifications (listener: %s)",
  async (hasListener) => {
    vi.stubGlobal("window", { clearTimeout, setTimeout });
    vi.stubGlobal("chrome", {
      storage: {
        onChanged: hasListener ? { addListener: vi.fn() } : undefined,
      },
    });
    const app = new StellarApp();
    const loadHistory = vi.fn(async () => undefined);
    app["loadHistoryAssets"] = loadHistory;
    Object.defineProperty(app, "updateComplete", {
      value: Promise.resolve(true),
    });

    app["togglePanel"]("history");
    expect(loadHistory).toHaveBeenCalledTimes(hasListener ? 0 : 1);

    loadHistory.mockClear();
    await app["navigateHistory"](1);
    expect(loadHistory).toHaveBeenCalledTimes(hasListener ? 0 : 1);
  },
);

it("restarts the controls timer on each navigation action", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { clearTimeout, setTimeout });
  const app = new StellarApp();
  app["loadHistoryAssets"] = vi.fn(async () => undefined);
  Object.defineProperty(app, "updateComplete", {
    value: Promise.resolve(true),
  });

  await app["navigateHistory"](1);
  vi.advanceTimersByTime(2000);
  await app["navigateHistory"](-1);
  vi.advanceTimersByTime(2000);
  expect(app["controlsVisible"]).toBe(true);
  vi.advanceTimersByTime(500);
  expect(app["controlsVisible"]).toBe(false);
});

it("keeps history open when dismissing or switching other panels", async () => {
  const app = new StellarApp();
  app["loadHistoryAssets"] = vi.fn(async () => undefined);
  app["loadCoreSettings"] = vi.fn(async () => undefined);
  app["showControls"] = vi.fn();
  Object.defineProperty(app, "renderRoot", {
    value: { querySelector: () => null },
  });
  Object.defineProperty(app, "updateComplete", {
    value: Promise.resolve(true),
  });

  app["togglePanel"]("history");
  app["closePanel"]();
  expect(app["historyOpen"]).toBe(true);
  for (const panel of ["info", "settings"] as const) {
    app["togglePanel"](panel);
    expect(app["historyOpen"]).toBe(true);
    app["closePanel"]();
    await Promise.resolve();
    expect(app["historyOpen"]).toBe(true);
  }
  expect(app["controlsLocked"]).toBe(true);

  app["togglePanel"]("history");
  expect(app["historyOpen"]).toBe(false);
  expect(app["controlsLocked"]).toBe(false);
});
