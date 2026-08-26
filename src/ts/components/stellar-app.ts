import { Camera, Download, History, Info, Settings } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";

import styles from "../../css/components/stellar-app.css?inline";
import { readCachedImage } from "../cache";
import { readHistory } from "../history";
import {
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  getDisplaySettings,
  getImageSourceId,
} from "../settings";
import { getImageSource } from "../sources";
import { getUnsplashPhotoInfo } from "../sources/unsplash";
import "./empty-state";
import "./history-panel";
import "./lucide-icon";
import "./photo-info";
import "./settings-drawer";

import type { DisplaySettings, PhotoDisplayMode } from "../settings";
import type { BackgroundAsset, WorkerCommand, WorkerResult } from "../types";
import type { EmptyStatePhase } from "./empty-state";
import type { SourceChangeState } from "./settings-drawer";

const UTM_PARAMS =
  "utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit";

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
  private accessor currentAsset: BackgroundAsset | null = null;

  @state()
  private accessor displaySettings: DisplaySettings = DEFAULT_DISPLAY_SETTINGS;

  @state()
  private accessor downloading = false;

  @state()
  private accessor historyOpen = false;

  @state()
  private accessor infoOpen = false;

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

    window.addEventListener("wheel", this.handleWheel, { passive: true });
    window.addEventListener("keydown", this.handleKeydown);

    const generation = ++this.generation;

    void this.loadDisplaySettings(generation);
    void this.loadSourceId(generation);
    void this.start(generation);
  }

  override disconnectedCallback(): void {
    this.generation += 1;
    this.requestInFlight = false;
    window.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("keydown", this.handleKeydown);
    this.releaseObjectUrl();
    super.disconnectedCallback();
  }

  override render() {
    const effectiveMode = this.effectiveDisplayMode;
    const motionEnabled = this.displaySettings.motion;
    const paused = this.settingsOpen || this.infoOpen;

    return html`
      <div
        class="app-viewport ${this.historyOpen ? "history-open" : ""}"
        @click=${this.handleViewportClick}
      >
        ${
          this.objectUrl
            ? keyed(
                this.objectUrl,
                html`
                  <div
                    class="photo-stage ${effectiveMode === "contain-blur" ? "mode-contain-blur" : "mode-cover"} ${motionEnabled ? "motion-enabled" : ""} ${paused ? "stage-paused" : ""}"
                    aria-hidden="true"
                  >
                    ${
                      effectiveMode === "contain-blur"
                        ? html`<div
                            class="photo-backdrop"
                            style="background-image: url('${this.objectUrl}')"
                          ></div>`
                        : null
                    }
                    <div
                      class="photo-main"
                      style="background-image: url('${this.objectUrl}')"
                    ></div>
                  </div>
                `,
              )
            : null
        }
        <stellar-empty-state
          .phase=${this.phase}
          @retry=${this.ensureAndRender}
        ></stellar-empty-state>
        ${
          this.currentAsset?.attribution && this.objectUrl
            ? (
                () => {
                  const info = getUnsplashPhotoInfo(this.currentAsset);
                  const photographerName =
                    info?.user?.name ?? this.currentAsset.attribution.name;
                  const photographerUrl =
                    info?.user?.link || this.currentAsset.attribution.url;
                  const photographerImage = info?.user?.profileImage;
                  const sourceUrl = this.currentAsset.attribution.sourceUrl;

                  return html`
                  <div class="bottom-credit">
                    <div class="photographer-card">
                      ${
                        photographerImage
                          ? html`<img
                              class="photographer-avatar"
                              src="${photographerImage}"
                              alt="${photographerName}"
                            />`
                          : html`<div class="photographer-avatar-placeholder">
                              <stellar-icon .icon=${Camera}></stellar-icon>
                            </div>`
                      }
                      <div class="photographer-details">
                        <a
                          class="photographer-name"
                          href="${this.appendUtm(photographerUrl)}"
                          target="_blank"
                          rel="noopener"
                        >
                          ${photographerName}
                        </a>
                        <span class="photographer-meta">
                          Photo on
                          <a
                            href="${this.appendUtm(sourceUrl)}"
                            target="_blank"
                            rel="noopener"
                          >
                            Unsplash
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>
                `;
                }
              )()
            : null
        }
        <div class="bottom-actions">
          ${
            this.isInfoAvailable
              ? html`
                <button
                  class="action-button info-button"
                  type="button"
                  aria-label=${this.infoOpen ? "Close photo info" : "Photo info"}
                  aria-expanded=${this.infoOpen}
                  title="Photo info"
                  @click=${this.toggleInfo}
                >
                  <stellar-icon .icon=${Info}></stellar-icon>
                </button>
              `
              : null
          }
          ${
            this.isDownloadable
              ? html`
                <button
                  class="action-button download-button"
                  type="button"
                  aria-label="Download photo"
                  title="Download photo"
                  ?disabled=${this.downloading}
                  @click=${this.downloadPhoto}
                >
                  <stellar-icon .icon=${Download}></stellar-icon>
                </button>
              `
              : null
          }
          <button
            class="action-button history-toggle ${this.historyOpen ? "active" : ""}"
            type="button"
            aria-label=${this.historyOpen ? "Close history" : "Photo history"}
            aria-expanded=${this.historyOpen}
            title="Photo history"
            @click=${this.toggleHistory}
          >
            <stellar-icon .icon=${History}></stellar-icon>
          </button>
          <button
            class="action-button settings-toggle"
            type="button"
            aria-label=${this.settingsOpen ? "Close settings" : "Open settings"}
            aria-expanded=${this.settingsOpen}
            @click=${this.toggleSettings}
          >
            <stellar-icon .icon=${Settings}></stellar-icon>
          </button>
        </div>
        <stellar-history-panel
          class="history-panel"
          .open=${this.historyOpen}
          .ready=${Boolean(this.objectUrl)}
          .activeAsset=${this.currentAsset}
          @select-photo=${this.handleSelectHistoryPhoto}
          @download-photo=${this.handleDownloadHistoryPhoto}
          @close-history=${this.closeHistory}
        ></stellar-history-panel>
      </div>
      ${
        this.infoOpen && this.currentAsset
          ? html`
            <stellar-photo-info
              .asset=${this.currentAsset}
              @close-info=${this.closeInfo}
            ></stellar-photo-info>
          `
          : null
      }
      ${
        this.settingsMounted
          ? html`
            <stellar-settings-drawer
              .open=${this.settingsOpen}
              .sourceId=${this.sourceId}
              .sourceChange=${this.sourceChange}
              .displaySettings=${this.displaySettings}
              @close-settings=${this.closeSettings}
              @select-source=${this.selectSource}
              @display-settings-changed=${this.handleDisplaySettingsChanged}
            ></stellar-settings-drawer>
          `
          : null
      }
    `;
  }

  private get isInfoAvailable(): boolean {
    if (!this.currentAsset || !this.objectUrl) return false;

    const source = getImageSource(this.currentAsset.sourceId);

    return Boolean(source?.supportsInfo);
  }

  private get isDownloadable(): boolean {
    if (!this.currentAsset || !this.objectUrl) return false;

    const source = getImageSource(this.currentAsset.sourceId);

    return Boolean(source?.supportsDownload);
  }

  private appendUtm(rawUrl: string): string {
    const separator = rawUrl.includes("?") ? "&" : "?";

    return `${rawUrl}${separator}${UTM_PARAMS}`;
  }

  private toggleInfo = (): void => {
    if (!this.infoOpen) {
      this.historyOpen = false;
    }

    this.infoOpen = !this.infoOpen;
  };

  private closeInfo = (): void => {
    this.infoOpen = false;
  };

  private get effectiveDisplayMode(): PhotoDisplayMode {
    const isPortrait =
      this.currentAsset !== null &&
      this.currentAsset.height > 0 &&
      this.currentAsset.width > 0 &&
      this.currentAsset.height > this.currentAsset.width;

    return isPortrait
      ? this.displaySettings.portraitMode
      : this.displaySettings.landscapeMode;
  }

  private async preparePhoto(
    metadata: BackgroundAsset,
    generation: number,
    photoGeneration: number,
  ): Promise<{ url: string; asset: BackgroundAsset } | null> {
    const response = await readCachedImage(metadata.cacheKey);

    if (!response || !this.isPhotoCurrent(generation, photoGeneration))
      return null;

    const nextUrl = URL.createObjectURL(await response.blob());
    let dims = { width: metadata.width, height: metadata.height };

    try {
      dims = await decodeObjectUrl(nextUrl);
    } catch {
      URL.revokeObjectURL(nextUrl);
      return null;
    }

    if (!this.isPhotoCurrent(generation, photoGeneration)) {
      URL.revokeObjectURL(nextUrl);
      return null;
    }

    const resolvedAsset: BackgroundAsset =
      metadata.width === 0 &&
      metadata.height === 0 &&
      (dims.width > 0 || dims.height > 0)
        ? { ...metadata, width: dims.width, height: dims.height }
        : metadata;

    return { url: nextUrl, asset: resolvedAsset };
  }

  private applyPhoto(nextUrl: string, asset: BackgroundAsset | null): void {
    const previous = this.objectUrl;

    this.objectUrl = nextUrl;
    this.currentAsset = asset;

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

      const prepared = await this.preparePhoto(
        current,
        generation,
        photoGeneration,
      );

      if (!prepared) return null;

      this.applyPhoto(prepared.url, prepared.asset);

      return prepared.asset;
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

      const prepared =
        result.current &&
        (await this.preparePhoto(result.current, generation, photoGeneration));

      if (!this.isPhotoCurrent(generation, photoGeneration)) return;
      if (!prepared) throw new Error("No usable image is available yet");

      this.applyPhoto(prepared.url, prepared.asset);

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

  private async loadDisplaySettings(generation: number): Promise<void> {
    try {
      const displaySettings = await getDisplaySettings();

      if (!this.isCurrent(generation)) return;

      this.displaySettings = displaySettings;
    } catch {
      return;
    }
  }

  private handleDisplaySettingsChanged = (
    event: CustomEvent<{ displaySettings: DisplaySettings }>,
  ): void => {
    this.displaySettings = event.detail.displaySettings;
  };

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

  private downloadAsset = async (asset: BackgroundAsset): Promise<void> => {
    if (this.downloading) return;

    const source = getImageSource(asset.sourceId);
    if (!source?.supportsDownload) return;

    this.downloading = true;

    try {
      const response = source.downloadFullAsset
        ? await source.downloadFullAsset(asset)
        : await readCachedImage(asset.cacheKey);
      const blob = response ? await response.blob() : null;

      if (!blob) throw new Error("Image data is not available");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `stellar-photos-${asset.sourceAssetId}.jpg`;

      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      void sendCommand({
        command: "track-download",
        asset,
      });
    } catch {
      // Graceful fallback
    } finally {
      this.downloading = false;
    }
  };

  private downloadPhoto = async (): Promise<void> => {
    if (!this.currentAsset) return;

    await this.downloadAsset(this.currentAsset);
  };

  private toggleHistory = (): void => {
    if (this.historyOpen) {
      this.closeHistory();
    } else {
      this.openHistory();
    }
  };

  private openHistory = (): void => {
    this.historyOpen = true;
    this.infoOpen = false;
    this.settingsOpen = false;
  };

  private closeHistory = (): void => {
    this.historyOpen = false;
  };

  private handleSelectHistoryPhoto = async (
    event: CustomEvent<{ asset: BackgroundAsset }>,
  ): Promise<void> => {
    const asset = event.detail.asset;
    const generation = this.generation;
    const photoGeneration = ++this.photoGeneration;

    const prepared = await this.preparePhoto(
      asset,
      generation,
      photoGeneration,
    );

    if (!prepared || !this.isPhotoCurrent(generation, photoGeneration)) return;

    this.applyPhoto(prepared.url, prepared.asset);
  };

  private handleDownloadHistoryPhoto = async (
    event: CustomEvent<{ asset: BackgroundAsset }>,
  ): Promise<void> => {
    await this.downloadAsset(event.detail.asset);
  };

  private handleWheel = (event: WheelEvent): void => {
    if (this.settingsOpen || this.infoOpen) return;

    const path = event.composedPath();
    const isInsideHistory = path.some(
      (el) =>
        el instanceof HTMLElement &&
        el.tagName.toLowerCase() === "stellar-history-panel",
    );

    if (isInsideHistory) return;

    if (event.deltaY < 0 && !this.historyOpen) {
      this.openHistory();
    } else if (event.deltaY > 0 && this.historyOpen) {
      this.closeHistory();
    }
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (this.historyOpen) this.closeHistory();
      if (this.infoOpen) this.closeInfo();
    }
  };

  private handleViewportClick = (event: MouseEvent): void => {
    if (!this.historyOpen) return;

    const path = event.composedPath();
    const isInsideHistory = path.some(
      (el) =>
        el instanceof HTMLElement &&
        (el.tagName.toLowerCase() === "stellar-history-panel" ||
          el.classList.contains("history-toggle")),
    );

    if (!isInsideHistory) {
      this.closeHistory();
    }
  };

  private toggleSettings = (): void => {
    if (!this.settingsOpen) {
      this.historyOpen = false;
      this.settingsMounted = true;
      void this.loadSourceId(this.generation);
    }

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

      const preparedResult = await this.preparePhoto(
        prepared,
        generation,
        photoGeneration,
      );

      if (!preparedResult)
        throw new Error("The photograph could not be displayed");

      preparedUrl = preparedResult.url;

      const commitResult = await sendCommand({
        command: "commit-source",
        asset: prepared,
      });

      if (!this.isPhotoCurrent(generation, photoGeneration)) return;
      if (!commitResult.ok) throw new Error(commitResult.error.message);

      committed = true;
      this.applyPhoto(preparedUrl, preparedResult.asset);
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
    this.currentAsset = null;
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

async function decodeObjectUrl(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
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
