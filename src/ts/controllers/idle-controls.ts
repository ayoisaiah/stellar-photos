import type { ReactiveController, ReactiveControllerHost } from "lit";

interface IdleControlsOptions {
  timeoutMs?: number;
  isLocked?: () => boolean;
}

class IdleControlsController implements ReactiveController {
  private host: ReactiveControllerHost;
  private timeoutMs: number;
  private isLocked: () => boolean;
  private timer: number | null = null;

  visible = false;

  constructor(host: ReactiveControllerHost, options?: IdleControlsOptions) {
    this.host = host;
    this.timeoutMs = options?.timeoutMs ?? 2500;
    this.isLocked = options?.isLocked ?? (() => false);
    host.addController(this);
  }

  hostConnected(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", this.handleMouseMove, {
        passive: true,
      });
      window.addEventListener("mouseleave", this.handleMouseLeave, {
        passive: true,
      });
    }
  }

  hostDisconnected(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", this.handleMouseMove);
      window.removeEventListener("mouseleave", this.handleMouseLeave);
    }
    this.clearTimer();
  }

  show(): void {
    this.clearTimer();
    if (!this.visible) {
      this.visible = true;
      this.host.requestUpdate();
    }

    if (!this.isLocked() && typeof window !== "undefined") {
      this.timer = window.setTimeout(() => {
        this.visible = false;
        this.timer = null;
        this.host.requestUpdate();
      }, this.timeoutMs);
    }
  }

  hide(): void {
    this.clearTimer();
    if (this.visible) {
      this.visible = false;
      this.host.requestUpdate();
    }
  }

  private clearTimer(): void {
    if (this.timer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private handleMouseMove = (): void => {
    this.show();
  };

  private handleMouseLeave = (): void => {
    if (!this.isLocked()) {
      this.hide();
    }
  };
}

export { IdleControlsController };
