import type { ReactiveController, ReactiveControllerHost } from "lit";

interface KeyboardShortcutsOptions {
  onPrev?: () => void;
  onNext?: () => void;
  onTogglePin?: () => void;
  onEscape?: () => void;
  isLocked?: () => boolean;
}

class KeyboardShortcutsController implements ReactiveController {
  private options: KeyboardShortcutsOptions;

  constructor(host: ReactiveControllerHost, options: KeyboardShortcutsOptions) {
    this.options = options;
    host.addController(this);
  }

  hostConnected(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleKeyDown);
    }
  }

  hostDisconnected(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleKeyDown);
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.options.onEscape?.();
      return;
    }

    const target = event.target;
    const isTyping =
      typeof HTMLElement !== "undefined" &&
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    if (isTyping) {
      return;
    }
    if (this.options.isLocked?.()) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.options.onPrev?.();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      this.options.onNext?.();
    } else if (event.key === "p" || event.key === "P") {
      event.preventDefault();
      this.options.onTogglePin?.();
    }
  };
}

export { KeyboardShortcutsController };
