import type { ReactiveControllerHost } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdleControlsController } from "../src/ts/controllers/idle-controls";
import { KeyboardShortcutsController } from "../src/ts/controllers/keyboard-shortcuts";

function createMockHost(): ReactiveControllerHost {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe("IdleControlsController", () => {
  const listeners: Record<string, ((event?: unknown) => void)[]> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    for (const key of Object.keys(listeners)) {
      delete listeners[key];
    }

    vi.stubGlobal("window", {
      addEventListener: (
        event: string,
        cb: (event?: unknown) => void,
      ): void => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      },
      removeEventListener: (
        event: string,
        cb: (event?: unknown) => void,
      ): void => {
        listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
      },
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows controls and hides after timeout", () => {
    const host = createMockHost();
    const controller = new IdleControlsController(host, { timeoutMs: 1000 });
    controller.hostConnected();

    controller.show();
    expect(controller.visible).toBe(true);
    expect(host.requestUpdate).toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(controller.visible).toBe(false);

    controller.hostDisconnected();
  });

  it("does not auto-hide when locked", () => {
    let locked = true;
    const host = createMockHost();
    const controller = new IdleControlsController(host, {
      timeoutMs: 1000,
      isLocked: () => locked,
    });
    controller.hostConnected();

    controller.show();
    expect(controller.visible).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(controller.visible).toBe(true);

    locked = false;
    controller.show();
    vi.advanceTimersByTime(1000);
    expect(controller.visible).toBe(false);

    controller.hostDisconnected();
  });

  it("hides on mouseleave if not locked", () => {
    const host = createMockHost();
    const controller = new IdleControlsController(host, { timeoutMs: 1000 });
    controller.hostConnected();

    controller.show();
    expect(controller.visible).toBe(true);

    for (const cb of listeners.mouseleave || []) {
      cb();
    }
    expect(controller.visible).toBe(false);

    controller.hostDisconnected();
  });
});

describe("KeyboardShortcutsController", () => {
  const listeners: Record<string, ((event?: unknown) => void)[]> = {};

  beforeEach(() => {
    for (const key of Object.keys(listeners)) {
      delete listeners[key];
    }

    vi.stubGlobal("window", {
      addEventListener: (
        event: string,
        cb: (event?: unknown) => void,
      ): void => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      },
      removeEventListener: (
        event: string,
        cb: (event?: unknown) => void,
      ): void => {
        listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function dispatchKey(key: string, target?: unknown) {
    const event = {
      key,
      target,
      preventDefault: vi.fn(),
    };
    for (const cb of listeners.keydown || []) {
      cb(event);
    }
    return event;
  }

  it("dispatches callbacks on key events", () => {
    const host = createMockHost();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onTogglePin = vi.fn();
    const onEscape = vi.fn();

    const controller = new KeyboardShortcutsController(host, {
      onPrev,
      onNext,
      onTogglePin,
      onEscape,
    });
    controller.hostConnected();

    dispatchKey("ArrowLeft");
    expect(onPrev).toHaveBeenCalledTimes(1);

    dispatchKey("ArrowRight");
    expect(onNext).toHaveBeenCalledTimes(1);

    dispatchKey("p");
    expect(onTogglePin).toHaveBeenCalledTimes(1);

    dispatchKey("P");
    expect(onTogglePin).toHaveBeenCalledTimes(2);

    dispatchKey("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);

    controller.hostDisconnected();
  });

  it("ignores navigation shortcuts when locked", () => {
    const locked = true;
    const host = createMockHost();
    const onPrev = vi.fn();
    const onEscape = vi.fn();

    const controller = new KeyboardShortcutsController(host, {
      isLocked: () => locked,
      onPrev,
      onEscape,
    });
    controller.hostConnected();

    dispatchKey("ArrowLeft");
    expect(onPrev).not.toHaveBeenCalled();

    // Escape should still work when locked
    dispatchKey("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);

    controller.hostDisconnected();
  });
});
