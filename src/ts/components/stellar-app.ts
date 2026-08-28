import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Info,
  MapPin,
  Pin,
  PinOff,
  Settings,
} from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";

import styles from "../../css/components/stellar-app.css?inline";
import { assetIdentity } from "../assets";
import { attributionUrl } from "../attribution";
import { readCachedImage } from "../cache";
import { KeyboardShortcutsController } from "../controllers/keyboard-shortcuts";
import { dispatch } from "../service-worker";
import {
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  getDisplaySettings,
  getImageSourceId,
} from "../settings";
import { getImageSource } from "../sources";
import { getUnsplashPhotoInfo } from "../sources/unsplash";
import {
  HISTORY_STORAGE_KEY,
  isBackgroundAsset,
  PINNED_STORAGE_KEY,
  readHistory,
  readPinnedAsset,
  validateHistoryState,
  writePinnedAsset,
} from "../storage";
import "./empty-state";
import "./history-panel";
import "./lucide-icon";
import "./photo-info";
import "./settings-drawer";

import type { BackgroundAsset } from "../assets";
import type { WorkerCommand, WorkerResult } from "../service-worker";
import type { DisplaySettings, PhotoDisplayMode } from "../settings";
import type { EmptyStatePhase } from "./empty-state";
import type { SourceChangeState } from "./settings-drawer";

@customElement("stellar-app")
class StellarApp extends LitElement {
  static override styles = unsafeCSS(styles);

  private controlsTimer: number | undefined;
  private lastWheelTime = 0;
  private objectUrl: string | null = null;
  private requestInFlight = false;
  private sourceSwitchInFlight = false;

  constructor() {
    super();

    new KeyboardShortcutsController(this, {
      isLocked: () => this.settingsOpen || this.infoOpen,
      onPrev: () => void this.navigateHistory(1),
      onNext: () => void this.navigateHistory(-1),
      onTogglePin: () => void this.togglePin(),
      onEscape: () => {
        if (this.historyOpen) {
          this.closeHistory();
        }
        if (this.infoOpen) {
          this.closeInfo();
        }
        if (this.settingsOpen) {
          this.closeSettings();
        }
      },
    });
  }

  @state()
  private accessor controlsVisible = false;

  @state()
  private accessor currentAsset: BackgroundAsset | null = null;

  @state()
  private accessor displaySettings: DisplaySettings = DEFAULT_DISPLAY_SETTINGS;

  @state()
  private accessor downloading = false;

  @state()
  private accessor historyAssets: BackgroundAsset[] = [];

  @state()
  private accessor historyOpen = false;

  @state()
  private accessor infoOpen = false;

  @state()
  private accessor pinnedAsset: BackgroundAsset | null = null;

  @state()
  private accessor phase: EmptyStatePhase = "ready";

  @state()
  private accessor settingsOpen = false;

  @state()
  private accessor sourceId: string = DEFAULT_CORE_SETTINGS.activeSourceId;

  @state()
  private accessor sourceChange: SourceChangeState = { status: "idle" };

  @state()
  private accessor historyIndex = 0;

  private get hasNext(): boolean {
    return (
      this.historyAssets.length > 0 &&
      (this.historyIndex > 0 || this.historyIndex === -1)
    );
  }

  private get hasPrevious(): boolean {
    return (
      this.historyAssets.length > 0 &&
      this.historyIndex !== -1 &&
      this.historyIndex < this.historyAssets.length - 1
    );
  }

  private get controlsLocked(): boolean {
    return this.historyOpen || this.settingsOpen || this.infoOpen;
  }

  private get isPinned(): boolean {
    return this.pinnedAsset !== null;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    window.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("click", this.handleViewportClick);

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(this.handleStorageChange);
    }

    void this.initializeState();
  }

  override disconnectedCallback(): void {
    this.requestInFlight = false;
    window.clearTimeout(this.controlsTimer);
    window.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("click", this.handleViewportClick);

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.handleStorageChange);
    }

    this.releaseObjectUrl();
    super.disconnectedCallback();
  }

  private get isInfoAvailable(): boolean {
    return (
      this.currentAsset !== null &&
      Boolean(getImageSource(this.currentAsset.sourceId)?.supportsInfo)
    );
  }

  private get isDownloadable(): boolean {
    return (
      this.currentAsset !== null &&
      Boolean(getImageSource(this.currentAsset.sourceId)?.supportsDownload)
    );
  }

  override render() {
    const controlsShown = this.controlsVisible || this.controlsLocked;

    return html`
      <div
        class="app-viewport ${this.historyOpen ? "history-open" : ""} ${controlsShown ? "controls-visible" : ""}"
        @click=${this.handleViewportClick}
        @pointermove=${this.showControls}
        @pointerleave=${this.showControls}
      >
        ${
          this.objectUrl
            ? this.renderPhotoStage(this.objectUrl, this.currentAsset)
            : null
        }
        <stellar-empty-state
          .phase=${this.phase}
          @retry=${this.ensureAndRender}
        ></stellar-empty-state>
        ${this.renderPhotoCredit()}
        ${
          this.phase === "ready" && this.currentAsset
            ? html`
              ${
                this.hasPrevious
                  ? html`
                    <button
                      class="nav-button prev-button"
                      type="button"
                      aria-label="Previous photo"
                      title="Previous photo (Left arrow)"
                      @click=${() => void this.navigateHistory(1)}
                    >
                      <stellar-icon .icon=${ChevronLeft}></stellar-icon>
                    </button>
                  `
                  : null
              }
              ${
                this.hasNext
                  ? html`
                    <button
                      class="nav-button next-button"
                      type="button"
                      aria-label="Next photo"
                      title="Next photo (Right arrow)"
                      @click=${() => void this.navigateHistory(-1)}
                    >
                      <stellar-icon .icon=${ChevronRight}></stellar-icon>
                    </button>
                  `
                  : null
              }
            `
            : null
        }
        <div class="bottom-actions">
          <button
            class="action-button pin-toggle ${this.isPinned ? "active" : ""}"
            type="button"
            aria-label=${this.isPinned ? "Resume new photos" : "Keep this photo"}
            aria-pressed=${this.isPinned}
            title=${this.isPinned ? "Resume new photos (P)" : "Keep this photo (P)"}
            @click=${this.togglePin}
          >
            <stellar-icon .icon=${this.isPinned ? PinOff : Pin}></stellar-icon>
          </button>
          ${
            this.isInfoAvailable
              ? html`
                <button
                  class="action-button info-button ${this.infoOpen ? "active" : ""}"
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
            class="action-button settings-toggle ${this.settingsOpen ? "active" : ""}"
            type="button"
            aria-label=${this.settingsOpen ? "Close settings" : "Open settings"}
            aria-expanded=${this.settingsOpen}
            title="Settings"
            @click=${this.toggleSettings}
          >
            <stellar-icon .icon=${Settings}></stellar-icon>
          </button>
        </div>
        <stellar-history-panel
          class="history-panel"
          .open=${this.historyOpen}
          .activeAsset=${this.currentAsset}
          .historyAssets=${this.historyAssets}
          @select-photo=${this.handleSelectHistoryPhoto}
          @download-photo=${this.handleDownloadHistoryPhoto}
          @close-history=${this.closeHistory}
        ></stellar-history-panel>
      </div>
      <stellar-photo-info
        .open=${this.infoOpen}
        .asset=${this.currentAsset}
        @close-info=${this.closeInfo}
      ></stellar-photo-info>
      <stellar-settings-drawer
        .open=${this.settingsOpen}
        .sourceId=${this.sourceId}
        .displaySettings=${this.displaySettings}
        .sourceChange=${this.sourceChange}
        @close-settings=${this.closeSettings}
        @select-source=${this.selectSource}
        @display-settings-changed=${this.handleDisplaySettingsChanged}
      ></stellar-settings-drawer>
    `;
  }

  private renderPhotoCredit() {
    if (!this.currentAsset?.attribution || !this.objectUrl) return null;

    const isEarthView = this.currentAsset.sourceId === "earthview";
    const info = isEarthView ? null : getUnsplashPhotoInfo(this.currentAsset);
    const photographerName =
      info?.user?.name ?? this.currentAsset.attribution.name;
    const photographerUrl =
      info?.user?.link || this.currentAsset.attribution.url;
    const photographerImage = info?.user?.profileImage;
    const sourceUrl =
      isEarthView && this.currentAsset.attribution.url
        ? this.currentAsset.attribution.url
        : this.currentAsset.attribution.sourceUrl;
    const source = getImageSource(this.currentAsset.sourceId);
    const sourceDisplayName =
      source?.name ?? (isEarthView ? "Google Earth View" : "Unsplash");

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
                  <stellar-icon .icon=${isEarthView ? MapPin : Camera}></stellar-icon>
                </div>`
          }
          <div class="photographer-details">
            ${
              photographerUrl
                ? html`
                  <a
                    class="photographer-name"
                    href="${attributionUrl(photographerUrl, this.currentAsset.sourceId)}"
                    target="_blank"
                    rel="noopener"
                  >
                    ${photographerName}
                  </a>
                `
                : html`
                  <span class="photographer-name">${photographerName}</span>
                `
            }
            <span class="photographer-meta">
              Photo on
              <a
                href="${attributionUrl(sourceUrl, this.currentAsset.sourceId)}"
                target="_blank"
                rel="noopener"
              >
                ${sourceDisplayName}
              </a>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  private toggleInfo = (): void => {
    if (!this.infoOpen) {
      this.historyOpen = false;
    }

    this.infoOpen = !this.infoOpen;
  };

  private closeInfo = (): void => {
    this.infoOpen = false;
    this.showControls();

    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLButtonElement>(".info-button")?.focus();
    });
  };

  private getEffectiveDisplayMode(
    asset: BackgroundAsset | null,
  ): PhotoDisplayMode {
    const isPortrait =
      asset !== null &&
      asset.height > 0 &&
      asset.width > 0 &&
      asset.height > asset.width;

    return isPortrait
      ? this.displaySettings.portraitMode
      : this.displaySettings.landscapeMode;
  }

  private renderPhotoStage(url: string, asset: BackgroundAsset | null) {
    const effectiveMode = this.getEffectiveDisplayMode(asset);
    const motionEnabled = this.displaySettings.motion;
    const paused = this.settingsOpen || this.infoOpen;

    return keyed(
      url,
      html`
        <div
          class="photo-stage ${effectiveMode === "contain-blur" ? "mode-contain-blur" : "mode-cover"} ${motionEnabled ? "motion-enabled" : ""} ${paused ? "stage-paused" : ""}"
          aria-hidden="true"
        >
          ${
            effectiveMode === "contain-blur"
              ? html`<div
                  class="photo-backdrop"
                  style="background-image: url('${url}')"
                ></div>`
              : null
          }
          <div
            class="photo-main"
            style="background-image: url('${url}')"
          ></div>
        </div>
      `,
    );
  }

  private async preparePhoto(
    metadata: BackgroundAsset,
  ): Promise<{ url: string; asset: BackgroundAsset } | null> {
    const response = await readCachedImage(metadata.cacheKey);

    if (!response || !this.isConnected) return null;

    const blob = await response.blob();
    const nextUrl = URL.createObjectURL(blob);

    if (!this.isConnected) {
      URL.revokeObjectURL(nextUrl);
      return null;
    }

    return { url: nextUrl, asset: metadata };
  }

  private applyPhoto(nextUrl: string, asset: BackgroundAsset | null): void {
    if (this.objectUrl === nextUrl) {
      this.currentAsset = asset;
      return;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = nextUrl;
    this.currentAsset = asset;
  }

  private ensureAndRender = async (): Promise<void> => {
    if (this.requestInFlight) return;

    this.requestInFlight = true;
    if (!this.objectUrl) this.phase = "loading";

    try {
      const result = await sendCommand({ command: "ensure-current" });

      if (!this.isConnected) return;
      if (!result.ok) throw new Error(result.error.message);

      const prepared =
        result.current && (await this.preparePhoto(result.current));

      if (prepared) {
        if (this.isConnected) {
          this.applyPhoto(prepared.url, prepared.asset);
          this.phase = "ready";
          await this.loadHistoryAssets();
          if (!this.isPinned) {
            void sendCommand({ command: "rotate" });
          }
        } else {
          URL.revokeObjectURL(prepared.url);
        }
      } else {
        throw new Error("No usable image is available yet");
      }
    } catch {
      if (this.isConnected && !this.objectUrl) {
        this.phase = "error";
      }
    } finally {
      if (this.isConnected) {
        this.requestInFlight = false;
      }
    }
  };

  private async initializeState(): Promise<void> {
    try {
      const [displaySettings, sourceId, pinned, historyState] =
        await Promise.all([
          getDisplaySettings().catch(() => DEFAULT_DISPLAY_SETTINGS),
          getImageSourceId().catch(() => DEFAULT_CORE_SETTINGS.activeSourceId),
          readPinnedAsset().catch(() => null),
          readHistory().catch(() => ({ history: [] })),
        ]);

      if (!this.isConnected) return;

      this.displaySettings = displaySettings;
      this.sourceId = sourceId;
      this.pinnedAsset = pinned;
      this.historyAssets = historyState.history;

      const current = pinned ?? historyState.history[0] ?? null;
      let rendered = false;

      if (current) {
        const prepared = await this.preparePhoto(current);
        if (prepared) {
          if (this.isConnected) {
            this.applyPhoto(prepared.url, prepared.asset);
            this.phase = "ready";
            rendered = true;
            if (!this.isPinned) {
              void sendCommand({ command: "rotate" });
            }
          } else {
            URL.revokeObjectURL(prepared.url);
          }
        }
      }

      if (!rendered) {
        await this.ensureAndRender();
      }
    } catch {
      await this.ensureAndRender();
    }
  }

  private handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (area === "local") {
      if (PINNED_STORAGE_KEY in changes) {
        const pinned = changes[PINNED_STORAGE_KEY]?.newValue;
        this.pinnedAsset = isBackgroundAsset(pinned) ? pinned : null;
      }

      if (HISTORY_STORAGE_KEY in changes) {
        const newValue = changes[HISTORY_STORAGE_KEY]?.newValue;
        const validated = validateHistoryState(newValue);
        if (validated) {
          this.historyAssets = validated.history;
          this.reconcileHistoryIndex();
        } else {
          void this.loadHistoryAssets();
        }
      }
    }
  };

  private reconcileHistoryIndex(): void {
    if (!this.currentAsset) {
      this.historyIndex = 0;
      return;
    }

    const index = this.historyAssets.findIndex(
      (asset) =>
        asset.cacheKey === this.currentAsset?.cacheKey &&
        asset.createdAt === this.currentAsset?.createdAt,
    );

    this.historyIndex = index;
  }

  private async loadHistoryAssets(): Promise<void> {
    try {
      const state = await readHistory();
      if (!this.isConnected) return;
      this.historyAssets = state.history;
      this.reconcileHistoryIndex();
    } catch {
      // Graceful fallback
    }
  }

  private togglePin = async (): Promise<void> => {
    await this.setPinnedState(this.pinnedAsset ? null : this.currentAsset);
  };

  private setPinnedState = async (
    asset: BackgroundAsset | null,
  ): Promise<void> => {
    await writePinnedAsset(asset);
    this.pinnedAsset = asset;
  };

  private showHistoryAsset = async (
    asset: BackgroundAsset,
  ): Promise<boolean> => {
    const prepared = await this.preparePhoto(asset);

    if (!prepared) return false;

    this.applyPhoto(prepared.url, prepared.asset);
    if (this.isPinned) {
      await this.setPinnedState(prepared.asset);
    }

    return true;
  };

  private navigateHistory = async (step: -1 | 1): Promise<void> => {
    if (this.historyAssets.length === 0) {
      await this.loadHistoryAssets();
    }
    if (step === 1 ? !this.hasPrevious : !this.hasNext) return;

    let targetIndex =
      this.historyIndex === -1 && step === -1 ? 0 : this.historyIndex + step;
    while (targetIndex >= 0 && targetIndex < this.historyAssets.length) {
      const targetAsset = this.historyAssets[targetIndex];
      if (!targetAsset) break;

      if (await this.showHistoryAsset(targetAsset)) {
        this.historyIndex = targetIndex;
        return;
      }

      targetIndex += step;
    }
  };

  private downloadAsset = async (asset: BackgroundAsset): Promise<void> => {
    if (this.downloading) return;

    this.downloading = true;
    try {
      const source = getImageSource(asset.sourceId);
      const response = source?.downloadFullAsset
        ? await source.downloadFullAsset(asset)
        : await readCachedImage(asset.cacheKey);

      if (!response) throw new Error("Image response unavailable");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = `${assetIdentity(asset)}.jpg`;

      const link = document.createElement("a");
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
    void this.loadHistoryAssets();
  };

  private closeHistory = (): void => {
    this.historyOpen = false;
    this.showControls();
  };

  private handleSelectHistoryPhoto = async (
    event: CustomEvent<{ asset: BackgroundAsset; index?: number }>,
  ): Promise<void> => {
    const selectedAsset = event.detail.asset;
    if (!(await this.showHistoryAsset(selectedAsset))) return;

    if (typeof event.detail.index === "number") {
      this.historyIndex = event.detail.index;
    } else {
      this.reconcileHistoryIndex();
    }
    if (!this.isPinned) {
      await this.setPinnedState(selectedAsset);
    }
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

    if (isInsideHistory) {
      event.preventDefault();
      const now = Date.now();
      if (now - this.lastWheelTime > 200) {
        if (event.deltaX > 15 || event.deltaY > 15) {
          this.lastWheelTime = now;
          void this.navigateHistory(1);
        } else if (event.deltaX < -15 || event.deltaY < -15) {
          this.lastWheelTime = now;
          void this.navigateHistory(-1);
        }
      }
      return;
    }

    if (event.deltaY < -30 && !this.historyOpen) {
      this.openHistory();
    } else if (event.deltaY > 30 && this.historyOpen) {
      this.closeHistory();
    }
  };

  private showControls = (): void => {
    window.clearTimeout(this.controlsTimer);
    this.controlsVisible = true;

    if (this.controlsLocked) return;

    this.controlsTimer = window.setTimeout(() => {
      this.controlsVisible = false;
    }, 2500);
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

  private async loadSourceId(): Promise<void> {
    try {
      this.sourceId = await getImageSourceId();
    } catch {
      // Graceful fallback
    }
  }

  private toggleSettings = (): void => {
    if (!this.settingsOpen) {
      this.historyOpen = false;
      void this.loadSourceId();
    }

    this.settingsOpen = !this.settingsOpen;
    if (!this.sourceSwitchInFlight) this.sourceChange = { status: "idle" };
  };

  private closeSettings = (): void => {
    this.settingsOpen = false;
    if (!this.sourceSwitchInFlight) this.sourceChange = { status: "idle" };
    this.showControls();

    void this.updateComplete.then(() => {
      this.renderRoot
        .querySelector<HTMLButtonElement>(".settings-toggle")
        ?.focus();
    });
  };

  private handleDisplaySettingsChanged = (
    event: CustomEvent<{ displaySettings: DisplaySettings }>,
  ): void => {
    this.displaySettings = event.detail.displaySettings;
  };

  private selectSource = async (
    event: CustomEvent<{ sourceId: string }>,
  ): Promise<void> => {
    if (this.sourceSwitchInFlight) return;

    let preparedUrl: string | null = null;

    this.sourceSwitchInFlight = true;
    this.sourceChange = { status: "switching" };

    try {
      const result = await sendCommand({
        command: "switch-source",
        sourceId: event.detail.sourceId,
      });

      if (!result.ok) throw new Error(result.error.message);
      if (!result.current)
        throw new Error("The source did not return a photograph");

      if (!this.isConnected) return;

      this.sourceId = event.detail.sourceId;
      this.pinnedAsset = null;

      const preparedResult = await this.preparePhoto(result.current);

      if (!preparedResult)
        throw new Error("The photograph could not be displayed");

      preparedUrl = preparedResult.url;

      this.applyPhoto(preparedUrl, preparedResult.asset);
      preparedUrl = null;
      this.phase = "ready";
      this.historyIndex = 0;
      await this.loadHistoryAssets();

      if (!this.isPinned) {
        void sendCommand({ command: "rotate" });
      }
    } catch (error) {
      if (this.isConnected) {
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

      this.sourceSwitchInFlight = false;

      if (this.isConnected && this.sourceChange.status === "switching") {
        this.sourceChange = { status: "idle" };
      }
    }
  };

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.currentAsset = null;
  }
}

async function sendCommand(command: WorkerCommand): Promise<WorkerResult> {
  if (command.command === "switch-source" && command.sourceId === "local") {
    return dispatch(command);
  }

  const activeSourceId = await getImageSourceId();
  if (
    activeSourceId === "local" &&
    (command.command === "rotate" || command.command === "ensure-current")
  ) {
    return dispatch(command);
  }

  try {
    const response = (await chrome.runtime.sendMessage(command)) as
      | WorkerResult
      | undefined;

    if (!response) {
      if (command.command === "ensure-current") return dispatch(command);

      return {
        ok: false,
        error: {
          code: "NO_RESPONSE",
          message: "The background process did not respond",
        },
      };
    }

    if (!response.ok && response.error.code === "NEEDS_PAGE_CONTEXT")
      return dispatch(command);

    return response;
  } catch (error) {
    if (command.command === "ensure-current") return dispatch(command);

    return {
      ok: false,
      error: {
        code: "RUNTIME_ERROR",
        message: error instanceof Error ? error.message : "Runtime error",
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-app": StellarApp;
  }
}

export { StellarApp };
