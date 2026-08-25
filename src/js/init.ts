import { html, LitElement } from "lit";

import { readCachedImage } from "./cache";
import { readHistory } from "./history";

import type { PhotoMetadata, WorkerCommand, WorkerResult } from "./types";

type AppPhase = "loading" | "ready" | "error";

const STATUS_MESSAGES: Record<AppPhase, string> = {
  loading: "Finding a stellar photo…",
  ready: "Photo ready",
  error: "We couldn’t load a photo. Check your connection and try again.",
};

class StellarApp extends LitElement {
  static override properties = {
    phase: { state: true },
  };

  private generation = 0;
  private objectUrl: string | null = null;
  private phase: AppPhase = "loading";
  private requestInFlight = false;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const generation = ++this.generation;

    void this.start(generation);
  }

  override disconnectedCallback(): void {
    this.generation += 1;
    this.requestInFlight = false;
    this.releaseObjectUrl();
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <main class="status-panel" aria-live="polite">
        <p>${STATUS_MESSAGES[this.phase]}</p>
        <button type="button" ?hidden=${this.phase !== "error"} @click=${this.ensureAndRender}>
          Retry
        </button>
      </main>
    `;
  }

  private async renderPhoto(
    metadata: PhotoMetadata,
    generation: number,
  ): Promise<boolean> {
    const response = await readCachedImage(metadata.cacheKey);

    if (!response || !this.isCurrent(generation)) return false;

    const nextUrl = URL.createObjectURL(await response.blob());

    try {
      await decodeObjectUrl(nextUrl);
    } catch {
      URL.revokeObjectURL(nextUrl);
      return false;
    }

    if (!this.isCurrent(generation)) {
      URL.revokeObjectURL(nextUrl);
      return false;
    }

    const previous = this.objectUrl;

    this.objectUrl = nextUrl;
    document.body.style.backgroundImage = `url("${nextUrl}")`;
    document.body.classList.add("has-image");

    if (previous) {
      URL.revokeObjectURL(previous);
    }

    return true;
  }

  private async optimisticCurrent(
    generation: number,
  ): Promise<PhotoMetadata | null> {
    try {
      const state = await readHistory();
      const current = state.history[0] ?? null;

      if (!current || !this.isCurrent(generation)) return null;

      return (await this.renderPhoto(current, generation)) ? current : null;
    } catch {
      return null;
    }
  }

  private ensureAndRender = async (): Promise<void> => {
    if (this.requestInFlight) return;

    const generation = this.generation;

    this.requestInFlight = true;
    this.phase = "loading";

    try {
      const result = await sendCommand({ command: "ensure-current" });

      if (!this.isCurrent(generation)) return;
      if (!result.ok) throw new Error(result.error.message);

      const rendered =
        result.current && (await this.renderPhoto(result.current, generation));

      if (!this.isCurrent(generation)) return;
      if (!rendered) throw new Error("No usable image is available yet");

      this.phase = "ready";
    } catch {
      if (this.isCurrent(generation)) this.phase = "error";
    } finally {
      if (this.isCurrent(generation)) this.requestInFlight = false;
    }
  };

  private async start(generation: number): Promise<void> {
    const current = await this.optimisticCurrent(generation);

    if (!this.isCurrent(generation)) return;

    if (current) {
      void sendCommand({ command: "rotate" });
    } else {
      await this.ensureAndRender();
    }
  }

  private isCurrent(generation: number): boolean {
    return this.isConnected && generation === this.generation;
  }

  private releaseObjectUrl(): void {
    if (!this.objectUrl) return;

    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    document.body.style.removeProperty("background-image");
    document.body.classList.remove("has-image");
  }
}

function sendCommand(command: WorkerCommand): Promise<WorkerResult> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      command,
      (response: WorkerResult | undefined) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            error: {
              code: "RUNTIME_ERROR",
              message: chrome.runtime.lastError.message ?? "Runtime error",
            },
          });
        } else {
          resolve(
            response ?? {
              ok: false,
              error: {
                code: "NO_RESPONSE",
                message: "The background process did not respond",
              },
            },
          );
        }
      },
    );
  });
}

async function decodeObjectUrl(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Cached image could not be decoded"));
    image.src = url;
  });
}

customElements.define("stellar-app", StellarApp);

declare global {
  interface HTMLElementTagNameMap {
    "stellar-app": StellarApp;
  }
}
