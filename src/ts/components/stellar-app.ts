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
import { KeyboardShortcutsController } from "../controllers/keyboard-shortcuts";
import { readImage } from "../image-reader";
import { dispatch } from "../service-worker";
import {
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  getActiveImageSourceIds,
  getCoreSettings,
  getDisplaySettings,
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
import type { PhotoFrequency } from "../sources/photo-frequency";
import type { EmptyStatePhase } from "./empty-state";

@customElement("stellar-app")
class StellarApp extends LitElement {
  static override styles = unsafeCSS(styles);

  private controlsTimer: number | undefined;
  private lastWheelTime = 0;
  private currentPhotoURL: string | null = null;

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
  private accessor photoLoadState: EmptyStatePhase = "ready";

  @state()
  private accessor settingsOpen = false;

  @state()
  private accessor activeSourceIds: string[] = [
    ...DEFAULT_CORE_SETTINGS.activeSourceIds,
  ];

  @state()
  private accessor photoFrequency: PhotoFrequency =
    DEFAULT_CORE_SETTINGS.photoFrequency;

  private get historyIndex(): number {
    if (!this.currentAsset) return 0;

    return this.historyAssets.findIndex(
      (asset) =>
        asset.cacheKey === this.currentAsset?.cacheKey &&
        asset.createdAt === this.currentAsset?.createdAt,
    );
  }

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
          this.currentPhotoURL
            ? this.renderPhotoStage(this.currentPhotoURL, this.currentAsset)
            : null
        }
        <stellar-empty-state
          .phase=${this.photoLoadState}
          @retry=${this.initializeState}
        ></stellar-empty-state>
        ${this.renderPhotoCredit()}
        ${
          this.photoLoadState === "ready" && this.currentAsset
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
            aria-label=${this.isPinned ? "Unpin this image" : "Pin this image"}
            aria-pressed=${this.isPinned}
            title=${this.isPinned ? "Unpin this image (P)" : "Pin this image (P)"}
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
        .activeSourceIds=${this.activeSourceIds}
        .photoFrequency=${this.photoFrequency}
        .displaySettings=${this.displaySettings}
        @close-settings=${this.closeSettings}
        @active-sources-changed=${this.handleActiveSourcesChanged}
        @frequency-changed=${this.handleFrequencyChanged}
        @display-settings-changed=${this.handleDisplaySettingsChanged}
      ></stellar-settings-drawer>
    `;
  }

  private renderPhotoCredit() {
    if (!this.currentAsset?.attribution || !this.currentPhotoURL) return null;

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
    const response = await readImage(metadata.cacheKey);

    if (!response) return null;

    const blob = await response.blob();
    const nextUrl = URL.createObjectURL(blob);

    return { url: nextUrl, asset: metadata };
  }

  private applyPhoto(nextUrl: string, asset: BackgroundAsset | null): void {
    if (this.currentPhotoURL) {
      URL.revokeObjectURL(this.currentPhotoURL);
    }

    this.currentPhotoURL = nextUrl;
    this.currentAsset = asset;
  }

  private loadCurrentPhoto = async (
    current?: BackgroundAsset,
  ): Promise<void> => {
    if (!this.currentPhotoURL) this.photoLoadState = "loading";

    try {
      if (!current) {
        const [pinned, { history }] = await Promise.all([
          readPinnedAsset(),
          readHistory(),
        ]);
        this.pinnedAsset = pinned;
        this.historyAssets = history;
        current = pinned ?? history[0];
      }

      const prepared = current && (await this.preparePhoto(current));

      if (!prepared) throw new Error("No usable image is available yet");

      this.applyPhoto(prepared.url, prepared.asset);
      this.photoLoadState = "ready";
    } catch (err) {
      console.error(err);
      if (!this.currentPhotoURL) this.photoLoadState = "error";
    }
  };

  private async initializeState(): Promise<void> {
    try {
      const [displaySettings, coreSettings, pinned, historyState] =
        await Promise.all([
          getDisplaySettings().catch(() => DEFAULT_DISPLAY_SETTINGS),
          getCoreSettings().catch(() => DEFAULT_CORE_SETTINGS),
          readPinnedAsset().catch(() => null),
          readHistory().catch(() => ({ history: [] })),
        ]);

      this.displaySettings = displaySettings;
      this.activeSourceIds = coreSettings.activeSourceIds;
      this.photoFrequency = coreSettings.photoFrequency;
      this.pinnedAsset = pinned;
      this.historyAssets = historyState.history;

      const current = pinned ?? historyState.history[0] ?? null;

      if (!current) {
        this.photoLoadState = "loading";

        const result = await sendCommand({ command: "nextImage" });
        if (!result.ok) throw new Error(result.error.message);
      }

      await this.loadCurrentPhoto(current ?? undefined);

      void sendCommand({ command: "nextImage" });
    } catch {
      await this.loadCurrentPhoto();
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
        } else {
          void this.loadHistoryAssets();
        }
      }
    }
  };

  private async loadHistoryAssets(): Promise<void> {
    try {
      const state = await readHistory();
      this.historyAssets = state.history;
    } catch {
      // Graceful fallback
    }
  }

  private togglePin = async (): Promise<void> => {
    const nextPinned = this.pinnedAsset ? null : this.currentAsset;
    await this.setPinnedState(nextPinned);

    if (!nextPinned) {
      void sendCommand({ command: "nextImage" });
    }
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
        : await readImage(asset.cacheKey);

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

  private async loadCoreSettings(): Promise<void> {
    try {
      const settings = await getCoreSettings();
      this.activeSourceIds = settings.activeSourceIds;
      this.photoFrequency = settings.photoFrequency;
    } catch {
      // Graceful fallback
    }
  }

  private toggleSettings = (): void => {
    if (!this.settingsOpen) {
      this.historyOpen = false;
      void this.loadCoreSettings();
    }

    this.settingsOpen = !this.settingsOpen;
  };

  private closeSettings = (): void => {
    this.settingsOpen = false;
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

  private handleFrequencyChanged = (
    event: CustomEvent<{ frequency: PhotoFrequency }>,
  ): void => {
    this.photoFrequency = event.detail.frequency;
  };

  private handleActiveSourcesChanged = (
    event: CustomEvent<{ sourceIds: string[] }>,
  ): void => {
    this.activeSourceIds = event.detail.sourceIds;

    if (
      this.currentAsset &&
      !event.detail.sourceIds.includes(this.currentAsset.sourceId)
    ) {
      void this.loadCurrentPhoto();
    }
  };

  private releaseObjectUrl(): void {
    if (this.currentPhotoURL) {
      URL.revokeObjectURL(this.currentPhotoURL);
      this.currentPhotoURL = null;
    }

    this.currentAsset = null;
  }
}

async function sendCommand(command: WorkerCommand): Promise<WorkerResult> {
  const activeSourceIds = await getActiveImageSourceIds();
  if (activeSourceIds.includes("local") && command.command === "nextImage") {
    return dispatch(command);
  }

  try {
    const response = (await chrome.runtime.sendMessage(command)) as
      | WorkerResult
      | undefined;

    if (!response) {
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
