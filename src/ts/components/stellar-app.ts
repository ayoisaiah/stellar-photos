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
import { readCachedImage } from "../cache";
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
  PINNED_STORAGE_KEY,
  readHistory,
  readPinned,
  validateHistoryState,
  writePinned,
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

const UTM_PARAMS =
  "utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit";

@customElement("stellar-app")
class StellarApp extends LitElement {
  static override styles = unsafeCSS(styles);

  private connectionGeneration = 0;
  private controlsTimer: number | null = null;
  private crossfadeTimer: number | null = null;
  private historyLoadGeneration = 0;
  private lastWheelTime = 0;
  private objectUrl: string | null = null;
  private requestInFlight = false;
  private navSequence = 0;
  private sourceLoadGeneration = 0;
  private sourceSwitchInFlight = false;

  @state()
  private accessor controlsVisible = false;

  @state()
  private accessor currentAsset: BackgroundAsset | null = null;

  @state()
  private accessor previousPhoto: {
    url: string;
    asset: BackgroundAsset | null;
  } | null = null;

  @state()
  private accessor displaySettings: DisplaySettings = DEFAULT_DISPLAY_SETTINGS;

  @state()
  private accessor downloading = false;

  @state()
  private accessor historyAssets: BackgroundAsset[] = [];

  @state()
  private accessor historyOpen = false;

  @state()
  private accessor historyMounted = false;

  @state()
  private accessor infoOpen = false;

  @state()
  private accessor infoMounted = false;

  @state()
  private accessor isPinned = false;

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

  override connectedCallback(): void {
    super.connectedCallback();
    this.connectionGeneration += 1;

    window.addEventListener("wheel", this.handleWheel, { passive: true });
    window.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("click", this.handleViewportClick);
    window.addEventListener("mousemove", this.handleMouseMove, {
      passive: true,
    });
    window.addEventListener("mouseleave", this.handleMouseLeave, {
      passive: true,
    });

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(this.handleStorageChange);
    }

    void this.initializeState();
  }

  override disconnectedCallback(): void {
    this.connectionGeneration += 1;
    this.requestInFlight = false;
    window.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("keydown", this.handleKeydown);
    window.removeEventListener("click", this.handleViewportClick);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseleave", this.handleMouseLeave);

    if (this.controlsTimer !== null) {
      window.clearTimeout(this.controlsTimer);
      this.controlsTimer = null;
    }

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.handleStorageChange);
    }

    this.releaseObjectUrl();
    super.disconnectedCallback();
  }

  override render() {
    const controlsShown =
      this.controlsVisible ||
      this.historyOpen ||
      this.settingsOpen ||
      this.infoOpen;

    return html`
      <div
        class="app-viewport ${this.historyOpen ? "history-open" : ""} ${controlsShown ? "controls-visible" : ""}"
        @click=${this.handleViewportClick}
        @mousemove=${this.handleMouseMove}
      >
        ${
          this.previousPhoto
            ? this.renderPhotoStage(
                this.previousPhoto.url,
                this.previousPhoto.asset,
                false,
              )
            : null
        }
        ${
          this.objectUrl
            ? this.renderPhotoStage(this.objectUrl, this.currentAsset, true)
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
                  const isEarthView =
                    this.currentAsset.sourceId === "earthview";
                  const info = isEarthView
                    ? null
                    : getUnsplashPhotoInfo(this.currentAsset);
                  const photographerName =
                    info?.user?.name ?? this.currentAsset.attribution.name;
                  const photographerUrl =
                    info?.user?.link || this.currentAsset.attribution.url;
                  const photographerImage = info?.user?.profileImage;
                  const sourceUrl = this.currentAsset.attribution.sourceUrl;
                  const sourceDisplayName = isEarthView
                    ? "Google Earth"
                    : "Unsplash";

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
                            ${sourceDisplayName}
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
                      @click=${this.handlePrevPhoto}
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
                      @click=${this.handleNextPhoto}
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
            aria-label=${this.isPinned ? "Unpin photo" : "Pin photo"}
            aria-pressed=${this.isPinned}
            title=${this.isPinned ? "Unpin photo (P)" : "Pin photo (P)"}
            @click=${this.togglePin}
          >
            <stellar-icon .icon=${this.isPinned ? PinOff : Pin}></stellar-icon>
          </button>
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
        ${
          this.historyMounted
            ? html`
              <stellar-history-panel
                class="history-panel"
                .open=${this.historyOpen}
                .activeAsset=${this.currentAsset}
                .historyAssets=${this.historyAssets}
                @select-photo=${this.handleSelectHistoryPhoto}
                @download-photo=${this.handleDownloadHistoryPhoto}
                @nav-next=${this.handleNextPhoto}
                @nav-prev=${this.handlePrevPhoto}
                @close-history=${this.closeHistory}
              ></stellar-history-panel>
            `
            : null
        }
      </div>
      ${
        this.infoMounted && this.currentAsset
          ? html`
            <stellar-photo-info
              .open=${this.infoOpen}
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
    if (!rawUrl) return "";
    if (this.currentAsset?.sourceId !== "unsplash") {
      return rawUrl;
    }

    const separator = rawUrl.includes("?") ? "&" : "?";

    return `${rawUrl}${separator}${UTM_PARAMS}`;
  }

  private toggleInfo = (): void => {
    if (!this.infoOpen) {
      this.historyOpen = false;
      this.infoMounted = true;
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

  private renderPhotoStage(
    url: string,
    asset: BackgroundAsset | null,
    isIncoming: boolean,
  ) {
    const effectiveMode = this.getEffectiveDisplayMode(asset);
    const motionEnabled = this.displaySettings.motion;
    const paused = this.settingsOpen || this.infoOpen;

    return keyed(
      url,
      html`
        <div
          class="photo-stage ${isIncoming ? "photo-stage-incoming" : "photo-stage-previous"} ${effectiveMode === "contain-blur" ? "mode-contain-blur" : "mode-cover"} ${motionEnabled ? "motion-enabled" : ""} ${paused ? "stage-paused" : ""}"
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
    let dims = { width: metadata.width, height: metadata.height };

    try {
      if (typeof Image !== "undefined") {
        const img = new Image();
        img.src = nextUrl;
        if ("decode" in img) {
          await img.decode();
        }
        if (dims.width === 0 && dims.height === 0 && img.naturalWidth > 0) {
          dims = { width: img.naturalWidth, height: img.naturalHeight };
        }
      } else if (metadata.width === 0 && metadata.height === 0) {
        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(blob);
          dims = { width: bitmap.width, height: bitmap.height };
          bitmap.close();
        } else {
          dims = await decodeObjectUrl(nextUrl);
        }
      }
    } catch {
      URL.revokeObjectURL(nextUrl);
      return null;
    }

    if (!this.isConnected) {
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
    if (this.objectUrl === nextUrl) {
      this.currentAsset = asset;
      return;
    }

    if (this.crossfadeTimer !== null) {
      window.clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }

    if (this.previousPhoto) {
      URL.revokeObjectURL(this.previousPhoto.url);
      this.previousPhoto = null;
    }

    if (this.objectUrl) {
      this.previousPhoto = {
        url: this.objectUrl,
        asset: this.currentAsset,
      };
    }

    this.objectUrl = nextUrl;
    this.currentAsset = asset;

    if (this.previousPhoto) {
      this.crossfadeTimer = window.setTimeout(() => {
        if (this.previousPhoto) {
          URL.revokeObjectURL(this.previousPhoto.url);
          this.previousPhoto = null;
        }
        this.crossfadeTimer = null;
      }, 550);
    }
  }

  private ensureAndRender = async (): Promise<void> => {
    if (this.requestInFlight) return;

    this.requestInFlight = true;
    const connGen = this.connectionGeneration;
    if (!this.objectUrl) this.phase = "loading";

    try {
      const result = await sendCommand({ command: "ensure-current" });

      if (!this.isConnected || connGen !== this.connectionGeneration) return;
      if (!result.ok) throw new Error(result.error.message);

      const prepared =
        result.current && (await this.preparePhoto(result.current));

      if (prepared) {
        if (this.isConnected && connGen === this.connectionGeneration) {
          this.applyPhoto(prepared.url, prepared.asset);
          this.phase = "ready";
          if (this.historyMounted || this.historyAssets.length > 0) {
            await this.loadHistoryAssets();
          }
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
      if (
        this.isConnected &&
        connGen === this.connectionGeneration &&
        !this.objectUrl
      ) {
        this.phase = "error";
      }
    } finally {
      if (this.isConnected && connGen === this.connectionGeneration) {
        this.requestInFlight = false;
      }
    }
  };

  private async initializeState(): Promise<void> {
    const connGen = this.connectionGeneration;

    try {
      const [displaySettings, sourceId, pinned, historyState] =
        await Promise.all([
          getDisplaySettings().catch(() => DEFAULT_DISPLAY_SETTINGS),
          getImageSourceId().catch(() => DEFAULT_CORE_SETTINGS.activeSourceId),
          readPinned().catch(() => false),
          readHistory().catch(() => ({ history: [] })),
        ]);

      if (!this.isConnected || connGen !== this.connectionGeneration) return;

      this.displaySettings = displaySettings;
      this.sourceId = sourceId;
      this.isPinned = pinned;

      const current = historyState.history[0] ?? null;
      let rendered = false;

      if (current) {
        const prepared = await this.preparePhoto(current);
        if (prepared) {
          if (this.isConnected && connGen === this.connectionGeneration) {
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
        void this.loadPinnedState();
      }

      if (HISTORY_STORAGE_KEY in changes) {
        const newValue = changes[HISTORY_STORAGE_KEY]?.newValue;
        const validated = validateHistoryState(newValue);
        if (validated) {
          this.historyLoadGeneration += 1;
          if (this.historyMounted || this.historyAssets.length > 0) {
            this.historyAssets = validated.history;
            this.reconcileHistoryIndex();
          }
        } else if (this.historyMounted || this.historyAssets.length > 0) {
          void this.loadHistoryAssets();
        }
      }
    }
  };

  private async loadPinnedState(): Promise<void> {
    const connGen = this.connectionGeneration;

    try {
      const isPinned = await readPinned();
      if (!this.isConnected || connGen !== this.connectionGeneration) return;
      this.isPinned = isPinned;
    } catch {
      // Graceful fallback
    }
  }

  private reconcileHistoryIndex(): void {
    if (!this.currentAsset) {
      this.historyIndex = 0;
      return;
    }

    const index = this.historyAssets.findIndex(
      (a) =>
        a.cacheKey === this.currentAsset?.cacheKey &&
        a.createdAt === this.currentAsset?.createdAt,
    );

    this.historyIndex = index;
  }

  private async loadHistoryAssets(): Promise<void> {
    const gen = ++this.historyLoadGeneration;
    const connGen = this.connectionGeneration;

    try {
      const state = await readHistory();
      if (
        gen !== this.historyLoadGeneration ||
        !this.isConnected ||
        connGen !== this.connectionGeneration
      ) {
        return;
      }
      this.historyAssets = state.history;
      this.reconcileHistoryIndex();
    } catch {
      // Graceful fallback
    }
  }

  private togglePin = async (): Promise<void> => {
    await this.setPinnedState(!this.isPinned);
  };

  private setPinnedState = async (pinned: boolean): Promise<void> => {
    this.isPinned = pinned;

    try {
      await writePinned(pinned);
    } catch {
      // Ignore storage error
    }
  };

  private displayHistoryAsset = async (
    asset: BackgroundAsset,
  ): Promise<"applied" | "missing" | "superseded"> => {
    const seq = ++this.navSequence;
    const connGen = this.connectionGeneration;
    const prepared = await this.preparePhoto(asset);

    if (
      seq !== this.navSequence ||
      !this.isConnected ||
      connGen !== this.connectionGeneration
    ) {
      if (prepared) URL.revokeObjectURL(prepared.url);
      return "superseded";
    }

    if (!prepared) return "missing";

    this.applyPhoto(prepared.url, prepared.asset);
    return "applied";
  };

  private handlePrevPhoto = async (): Promise<void> => {
    if (this.historyAssets.length === 0) {
      await this.loadHistoryAssets();
    }
    if (!this.hasPrevious) return;

    let targetIndex = this.historyIndex + 1;
    while (targetIndex < this.historyAssets.length) {
      const targetAsset = this.historyAssets[targetIndex];
      if (!targetAsset) break;

      const result = await this.displayHistoryAsset(targetAsset);
      if (result === "superseded") return;
      if (result === "applied") {
        this.historyIndex = targetIndex;
        return;
      }

      targetIndex += 1;
    }
  };

  private handleNextPhoto = async (): Promise<void> => {
    if (this.historyAssets.length === 0) {
      await this.loadHistoryAssets();
    }
    if (!this.hasNext) return;

    let targetIndex = this.historyIndex === -1 ? 0 : this.historyIndex - 1;
    while (targetIndex >= 0) {
      const targetAsset = this.historyAssets[targetIndex];
      if (!targetAsset) break;

      const result = await this.displayHistoryAsset(targetAsset);
      if (result === "superseded") return;
      if (result === "applied") {
        this.historyIndex = targetIndex;
        return;
      }

      targetIndex -= 1;
    }
  };

  private handleDisplaySettingsChanged = (
    event: CustomEvent<{ displaySettings: DisplaySettings }>,
  ): void => {
    this.displaySettings = event.detail.displaySettings;
  };

  private async loadSourceId(): Promise<void> {
    const sourceLoadGeneration = ++this.sourceLoadGeneration;

    try {
      const sourceId = await getImageSourceId();

      if (
        this.isConnected &&
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
    this.historyMounted = true;
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
    const result = await this.displayHistoryAsset(selectedAsset);

    if (result === "applied") {
      if (typeof event.detail.index === "number") {
        this.historyIndex = event.detail.index;
      } else {
        this.reconcileHistoryIndex();
      }
      await this.setPinnedState(true);
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
      const now = Date.now();
      if (now - this.lastWheelTime > 200) {
        if (event.deltaX > 15 || event.deltaY > 15) {
          this.lastWheelTime = now;
          void this.handleNextPhoto();
        } else if (event.deltaX < -15 || event.deltaY < -15) {
          this.lastWheelTime = now;
          void this.handlePrevPhoto();
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

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (this.historyOpen) this.closeHistory();
      if (this.infoOpen) this.closeInfo();
      return;
    }

    const target = event.target;
    const isTyping =
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    if (isTyping) return;

    if (event.key === "ArrowLeft") {
      if (!this.settingsOpen && !this.infoOpen) {
        event.preventDefault();
        this.showControls();
        void this.handlePrevPhoto();
      }
    } else if (event.key === "ArrowRight") {
      if (!this.settingsOpen && !this.infoOpen) {
        event.preventDefault();
        this.showControls();
        void this.handleNextPhoto();
      }
    } else if (event.key === "p" || event.key === "P") {
      if (!this.settingsOpen && !this.infoOpen) {
        event.preventDefault();
        this.showControls();
        void this.togglePin();
      }
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

  private handleMouseMove = (): void => {
    this.showControls();
  };

  private handleMouseLeave = (): void => {
    if (!this.historyOpen && !this.settingsOpen && !this.infoOpen) {
      this.hideControls();
    }
  };

  private showControls(): void {
    if (this.controlsTimer !== null) {
      window.clearTimeout(this.controlsTimer);
    }

    this.controlsVisible = true;

    if (!this.historyOpen && !this.settingsOpen && !this.infoOpen) {
      this.controlsTimer = window.setTimeout(() => {
        this.controlsVisible = false;
        this.controlsTimer = null;
      }, 2500);
    }
  }

  private hideControls(): void {
    if (this.controlsTimer !== null) {
      window.clearTimeout(this.controlsTimer);
      this.controlsTimer = null;
    }

    this.controlsVisible = false;
  }

  private toggleSettings = (): void => {
    if (!this.settingsOpen) {
      this.historyOpen = false;
      this.settingsMounted = true;
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

  private selectSource = async (
    event: CustomEvent<{ sourceId: string }>,
  ): Promise<void> => {
    if (this.sourceSwitchInFlight) return;

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

      if (!this.isConnected) return;

      const preparedResult = await this.preparePhoto(prepared);

      if (!preparedResult)
        throw new Error("The photograph could not be displayed");

      preparedUrl = preparedResult.url;

      const commitResult = await sendCommand({
        command: "commit-source",
        asset: prepared,
      });

      if (!this.isConnected) return;
      if (!commitResult.ok) throw new Error(commitResult.error.message);

      committed = true;
      this.applyPhoto(preparedUrl, preparedResult.asset);
      preparedUrl = null;
      this.sourceId = event.detail.sourceId;
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
      if (prepared && !committed) {
        void sendCommand({ command: "discard-source", asset: prepared });
      }

      this.sourceSwitchInFlight = false;

      if (this.isConnected && this.sourceChange.status === "switching") {
        this.sourceChange = { status: "idle" };
      }
    }
  };

  private releaseObjectUrl(): void {
    if (this.crossfadeTimer !== null) {
      window.clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }

    if (this.previousPhoto) {
      URL.revokeObjectURL(this.previousPhoto.url);
      this.previousPhoto = null;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.currentAsset = null;
  }
}

async function sendCommand(command: WorkerCommand): Promise<WorkerResult> {
  if (
    (command.command === "prepare-source" && command.sourceId === "local") ||
    (command.command === "commit-source" &&
      command.asset.sourceId === "local") ||
    (command.command === "discard-source" && command.asset.sourceId === "local")
  ) {
    return dispatch(command);
  }

  const activeSourceId = await getImageSourceId();
  if (
    activeSourceId === "local" &&
    (command.command === "rotate" || command.command === "ensure-current")
  ) {
    return dispatch(command);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      command,
      (response: WorkerResult | undefined) => {
        if (chrome.runtime.lastError) {
          if (command.command === "ensure-current") {
            void dispatch(command).then(resolve);
          } else {
            resolve({
              ok: false,
              error: {
                code: "RUNTIME_ERROR",
                message: chrome.runtime.lastError.message ?? "Runtime error",
              },
            });
          }
        } else if (
          response &&
          !response.ok &&
          response.error.code === "NEEDS_PAGE_CONTEXT"
        ) {
          void dispatch(command).then(resolve);
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
