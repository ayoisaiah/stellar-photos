import { Settings } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import styles from "../../css/components/stellar-app.css?inline";
import { readCachedImage } from "../cache";
import { readHistory } from "../history";
import { DEFAULT_CORE_SETTINGS, getImageSourceId } from "../settings";
import "./empty-state";
import "./lucide-icon";
import "./settings-drawer";

import type { BackgroundAsset, WorkerCommand, WorkerResult } from "../types";
import type { EmptyStatePhase } from "./empty-state";
import type { SourceChangeState } from "./settings-drawer";

@customElement("stellar-app")
class StellarApp extends LitElement {
  static override styles = unsafeCSS(styles);

  private generation = 0;
  private objectUrl: string | null = null;
  private photoGeneration = 0;
  private requestInFlight = false;
  private sourceLoadGeneration = 0;
  private sourceSwitchInFlight = false;

  @state()
  private accessor phase: EmptyStatePhase = "ready";

  @state()
  private accessor settingsOpen = false;

  @state()
  private accessor settingsMounted = false;

  @state()
  private accessor sourceId: string = DEFAULT_CORE_SETTINGS.activeSourceId;

  @state()
  private accessor sourceChange: SourceChangeState = { status: "idle" };

  override connectedCallback(): void {
    super.connectedCallback();

    const generation = ++this.generation;

    void this.loadSourceId(generation);
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
      <stellar-empty-state
        .phase=${this.phase}
        @retry=${this.ensureAndRender}
      ></stellar-empty-state>
      <button
        class="settings-toggle"
        type="button"
        aria-label=${this.settingsOpen ? "Close settings" : "Open settings"}
        aria-expanded=${this.settingsOpen}
        @click=${this.toggleSettings}
      >
        <stellar-icon .icon=${Settings}></stellar-icon>
      </button>
      ${
        this.settingsMounted
          ? html`
            <stellar-settings-drawer
              .open=${this.settingsOpen}
              .sourceId=${this.sourceId}
              .sourceChange=${this.sourceChange}
              @close-settings=${this.closeSettings}
              @select-source=${this.selectSource}
            ></stellar-settings-drawer>
          `
          : null
      }
    `;
  }

  private async preparePhoto(
    metadata: BackgroundAsset,
    generation: number,
    photoGeneration: number,
  ): Promise<string | null> {
    const response = await readCachedImage(metadata.cacheKey);

    if (!response || !this.isPhotoCurrent(generation, photoGeneration))
      return null;

    const nextUrl = URL.createObjectURL(await response.blob());

    try {
      await decodeObjectUrl(nextUrl);
    } catch {
      URL.revokeObjectURL(nextUrl);
      return null;
    }

    if (!this.isPhotoCurrent(generation, photoGeneration)) {
      URL.revokeObjectURL(nextUrl);
      return null;
    }

    return nextUrl;
  }

  private applyPhoto(nextUrl: string): void {
    const previous = this.objectUrl;

    this.objectUrl = nextUrl;
    document.body.style.backgroundImage = `url("${nextUrl}")`;

    if (previous) {
      URL.revokeObjectURL(previous);
    }
  }

  private async optimisticCurrent(
    generation: number,
    photoGeneration: number,
  ): Promise<BackgroundAsset | null> {
    try {
      const state = await readHistory();
      const current = state.history[0] ?? null;

      if (!current || !this.isPhotoCurrent(generation, photoGeneration))
        return null;

      const nextUrl = await this.preparePhoto(
        current,
        generation,
        photoGeneration,
      );

      if (!nextUrl) return null;

      this.applyPhoto(nextUrl);

      return current;
    } catch {
      return null;
    }
  }

  private ensureAndRender = async (): Promise<void> => {
    if (this.requestInFlight) return;

    const generation = this.generation;
    const photoGeneration = ++this.photoGeneration;

    this.requestInFlight = true;
    if (!this.objectUrl) this.phase = "loading";

    try {
      const result = await sendCommand({ command: "ensure-current" });

      if (!this.isCurrent(generation)) return;
      if (!result.ok) throw new Error(result.error.message);

      const nextUrl =
        result.current &&
        (await this.preparePhoto(result.current, generation, photoGeneration));

      if (!this.isPhotoCurrent(generation, photoGeneration)) return;
      if (!nextUrl) throw new Error("No usable image is available yet");

      this.applyPhoto(nextUrl);

      this.phase = "ready";
    } catch {
      if (this.isCurrent(generation) && !this.objectUrl) this.phase = "error";
    } finally {
      if (this.isCurrent(generation)) this.requestInFlight = false;
    }
  };

  private async start(generation: number): Promise<void> {
    const photoGeneration = ++this.photoGeneration;
    const current = await this.optimisticCurrent(generation, photoGeneration);

    if (!this.isPhotoCurrent(generation, photoGeneration)) return;

    if (current) {
      this.phase = "ready";
      void sendCommand({ command: "rotate" });
    } else {
      await this.ensureAndRender();
    }
  }

  private async loadSourceId(generation: number): Promise<void> {
    const sourceLoadGeneration = ++this.sourceLoadGeneration;

    try {
      const sourceId = await getImageSourceId();

      if (
        this.isCurrent(generation) &&
        sourceLoadGeneration === this.sourceLoadGeneration
      ) {
        this.sourceId = sourceId;
      }
    } catch {
      return;
    }
  }

  private toggleSettings = (): void => {
    if (!this.settingsOpen) this.settingsMounted = true;

    this.settingsOpen = !this.settingsOpen;
    if (!this.sourceSwitchInFlight) this.sourceChange = { status: "idle" };
  };

  private closeSettings = (): void => {
    this.settingsOpen = false;
    if (!this.sourceSwitchInFlight) this.sourceChange = { status: "idle" };

    void this.updateComplete.then(() => {
      this.renderRoot
        .querySelector<HTMLButtonElement>(".settings-toggle")
        ?.focus();
    });
  };

  private selectSource = async (
    event: CustomEvent<{ sourceId: string }>,
  ): Promise<void> => {
    if (this.sourceSwitchInFlight) return;

    const generation = this.generation;
    const photoGeneration = ++this.photoGeneration;
    let prepared: BackgroundAsset | null = null;
    let preparedUrl: string | null = null;
    let committed = false;

    this.sourceLoadGeneration += 1;
    this.sourceSwitchInFlight = true;
    this.sourceChange = { status: "switching" };

    try {
      const result = await sendCommand({
        command: "prepare-source",
        sourceId: event.detail.sourceId,
      });

      if (!result.ok) throw new Error(result.error.message);
      if (!result.current)
        throw new Error("The source did not return a photograph");

      prepared = result.current;

      if (!this.isPhotoCurrent(generation, photoGeneration)) return;

      preparedUrl = await this.preparePhoto(
        prepared,
        generation,
        photoGeneration,
      );

      if (!preparedUrl)
        throw new Error("The photograph could not be displayed");

      const commitResult = await sendCommand({
        command: "commit-source",
        asset: prepared,
      });

      if (!this.isPhotoCurrent(generation, photoGeneration)) return;
      if (!commitResult.ok) throw new Error(commitResult.error.message);

      committed = true;
      this.applyPhoto(preparedUrl);
      preparedUrl = null;
      this.sourceId = event.detail.sourceId;
      this.phase = "ready";
    } catch (error) {
      if (this.isCurrent(generation)) {
        this.sourceChange = {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Couldn’t switch photo sources.",
        };
      }
    } finally {
      if (preparedUrl) URL.revokeObjectURL(preparedUrl);
      if (prepared && !committed) {
        void sendCommand({ command: "discard-source", asset: prepared });
      }

      this.sourceSwitchInFlight = false;

      if (
        this.isCurrent(generation) &&
        this.sourceChange.status === "switching"
      ) {
        this.sourceChange = { status: "idle" };
      }
    }
  };

  private isCurrent(generation: number): boolean {
    return this.isConnected && generation === this.generation;
  }

  private isPhotoCurrent(generation: number, photoGeneration: number): boolean {
    return (
      this.isCurrent(generation) && photoGeneration === this.photoGeneration
    );
  }

  private releaseObjectUrl(): void {
    if (!this.objectUrl) return;

    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    document.body.style.removeProperty("background-image");
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

declare global {
  interface HTMLElementTagNameMap {
    "stellar-app": StellarApp;
  }
}
