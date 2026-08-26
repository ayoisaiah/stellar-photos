// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Info,
  MapPin,
  Pause,
  Play,
  Settings,
} from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";

import styles from "../../css/components/stellar-app.css?inline";
import { assetIdentity } from "../assets";
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
import { dispatch } from "../service-worker";
import {
  HISTORY_STORAGE_KEY,
  LEGACY_IMAGE_PAUSED_KEY,
  PAUSED_STORAGE_KEY,
  readPaused,
  writePaused,
} from "../storage";
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

  private controlsTimer: number | null = null;
  private generation = 0;
  private objectUrl: string | null = null;
  private photoGeneration = 0;
  private requestInFlight = false;
  private sourceLoadGeneration = 0;
  private sourceSwitchInFlight = false;

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
  private accessor infoMounted = false;

  @state()
  private accessor isPaused = false;

  @state()
  private accessor loadingNext = false;

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

  private get currentIndex(): number {
    if (!this.currentAsset || this.historyAssets.length === 0) return 0;

    const index = this.historyAssets.findIndex(
      (asset) => assetIdentity(asset) === assetIdentity(this.currentAsset!),
    );

    return index === -1 ? 0 : index;
  }

  private get hasPrevious(): boolean {
    return this.currentIndex < this.historyAssets.length - 1;
  }

  override connectedCallback(): void {
    super.connectedCallback();

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
    const effectiveMode = this.effectiveDisplayMode;
    const motionEnabled = this.displaySettings.motion;
    const paused = this.settingsOpen || this.infoOpen;
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
              <button
                class="nav-button next-button ${this.loadingNext ? "loading" : ""}"
                type="button"
                aria-label="Next photo"
                title="Next photo (Right arrow)"
                ?disabled=${this.loadingNext}
                @click=${this.handleNextPhoto}
              >
                <stellar-icon .icon=${ChevronRight}></stellar-icon>
              </button>
            `
            : null
        }
        <div class="bottom-actions">
          <button
            class="action-button pause-toggle ${this.isPaused ? "active" : ""}"
            type="button"
            aria-label=${this.isPaused ? "Resume photo rotation" : "Pause photo rotation"}
            aria-pressed=${this.isPaused}
            title=${this.isPaused ? "Resume photo rotation (P)" : "Pause photo rotation (P)"}
            @click=${this.togglePause}
          >
            <stellar-icon .icon=${this.isPaused ? Play : Pause}></stellar-icon>
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
      if (!this.isPaused) {
        void sendCommand({ command: "rotate" });
      }
    } catch {
      if (this.isCurrent(generation) && !this.objectUrl) this.phase = "error";
    } finally {
      if (this.isCurrent(generation)) this.requestInFlight = false;
    }
  };

  private async start(generation: number): Promise<void> {
    await this.loadPausedState();
    await this.loadHistoryAssets();

    const photoGeneration = ++this.photoGeneration;
    const current = await this.optimisticCurrent(generation, photoGeneration);

    if (!this.isPhotoCurrent(generation, photoGeneration)) return;

    if (current) {
      this.phase = "ready";
      if (!this.isPaused) {
        void sendCommand({ command: "rotate" });
      }
    } else {
      await this.ensureAndRender();
      await this.loadHistoryAssets();
    }
  }

  private handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (area === "local") {
      if (PAUSED_STORAGE_KEY in changes || LEGACY_IMAGE_PAUSED_KEY in changes) {
        void this.loadPausedState();
      }

      if (HISTORY_STORAGE_KEY in changes || "history" in changes) {
        void this.loadHistoryAssets();
      }
    }
  };

  private async loadPausedState(): Promise<void> {
    try {
      this.isPaused = await readPaused();
    } catch {
      // Graceful fallback
    }
  }

  private async loadHistoryAssets(): Promise<void> {
    try {
      const state = await readHistory();
      this.historyAssets = state.history;
    } catch {
      // Graceful fallback
    }
  }

  private togglePause = async (): Promise<void> => {
    await this.setPausedState(!this.isPaused);
  };

  private setPausedState = async (paused: boolean): Promise<void> => {
    this.isPaused = paused;

    try {
      await writePaused(paused);
    } catch {
      // Ignore storage error
    }
  };

  private displayHistoryAsset = async (
    asset: BackgroundAsset,
  ): Promise<void> => {
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

  private handlePrevPhoto = async (): Promise<void> => {
    if (!this.hasPrevious || this.loadingNext) return;

    const nextIndex = this.currentIndex + 1;
    const targetAsset = this.historyAssets[nextIndex];
    if (!targetAsset) return;

    await this.setPausedState(true);
    await this.displayHistoryAsset(targetAsset);
  };

  private handleNextPhoto = async (): Promise<void> => {
    if (this.loadingNext) return;

    if (this.currentIndex > 0) {
      const nextIndex = this.currentIndex - 1;
      const targetAsset = this.historyAssets[nextIndex];
      if (!targetAsset) return;

      await this.displayHistoryAsset(targetAsset);
      return;
    }

    this.loadingNext = true;

    try {
      const result = await sendCommand({ command: "rotate", force: true });
      if (!result.ok) throw new Error(result.error.message);

      if (result.current) {
        const generation = this.generation;
        const photoGeneration = ++this.photoGeneration;
        const prepared = await this.preparePhoto(
          result.current,
          generation,
          photoGeneration,
        );

        if (prepared && this.isPhotoCurrent(generation, photoGeneration)) {
          this.applyPhoto(prepared.url, prepared.asset);
          await this.loadHistoryAssets();
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      this.loadingNext = false;
    }
  };

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
    this.showControls();
  };

  private handleSelectHistoryPhoto = async (
    event: CustomEvent<{ asset: BackgroundAsset }>,
  ): Promise<void> => {
    await this.setPausedState(true);
    await this.displayHistoryAsset(event.detail.asset);
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
    } else if (event.key === "p" || event.key === "P" || event.key === " ") {
      if (!this.settingsOpen && !this.infoOpen) {
        event.preventDefault();
        this.showControls();
        void this.togglePause();
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
      void this.loadSourceId(this.generation);
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
      await this.loadHistoryAssets();

      if (!this.isPaused) {
        void sendCommand({ command: "rotate" });
      }
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
