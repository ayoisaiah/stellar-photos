import { Download, ExternalLink, Image } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/history-panel.css?inline";
import type { BackgroundAsset } from "../assets";
import { readCachedImage } from "../cache";
import { getImageSource } from "../sources";
import { HISTORY_LIMIT } from "../storage";
import "./lucide-icon";

const UTM_PARAMS =
  "utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit";

@customElement("stellar-history-panel")
class HistoryPanel extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true })
  accessor open = false;

  @property({ type: Boolean })
  accessor ready = false;

  @property({ attribute: false })
  accessor activeAsset: BackgroundAsset | null = null;

  @property({ attribute: false })
  accessor historyAssets: BackgroundAsset[] = [];

  @state()
  private accessor thumbnailUrls = new Map<string, string>();

  private loadGeneration = 0;

  private idleHandle: number | null = null;
  private timeoutHandle: number | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.open) {
      void this.loadThumbnails();
    } else if (this.ready) {
      this.scheduleDeferredLoad();
    }
  }

  override disconnectedCallback(): void {
    this.cancelScheduledLoad();
    this.loadGeneration += 1;
    this.cleanupThumbnailUrls();
    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (
      changedProperties.has("open") ||
      changedProperties.has("historyAssets") ||
      changedProperties.has("activeAsset") ||
      changedProperties.has("ready")
    ) {
      if (this.open) {
        void this.loadThumbnails();
      } else if (this.ready) {
        this.scheduleDeferredLoad();
      }
    }
  }

  override render() {
    const totalSlots = HISTORY_LIMIT;
    const assets =
      this.historyAssets.length > 0
        ? this.historyAssets
        : this.activeAsset
          ? [this.activeAsset]
          : [];
    const placeholderCount = Math.max(0, totalSlots - assets.length);
    const placeholders = Array.from({ length: placeholderCount });

    return html`
      <ul
        class="history-list"
        role="region"
        aria-label="Photo history"
      >
        ${assets.map((asset, index) => this.renderCard(asset, index))}
        ${placeholders.map(() => this.renderPlaceholder())}
      </ul>
    `;
  }

  private renderCard(asset: BackgroundAsset, index: number) {
    const thumbnailUrl = this.thumbnailUrls.get(asset.cacheKey);
    const description = asset.description || "photo";
    const sourceUrl = asset.attribution?.sourceUrl ?? "";
    const supportsDownload = Boolean(
      getImageSource(asset.sourceId)?.supportsDownload,
    );

    return html`
      <li
        class="history-card"
        data-cache-key="${asset.cacheKey}"
        tabindex="0"
        role="button"
        aria-label="Set ${description} as background"
        @click=${() => this.selectAsset(asset, index)}
        @keydown=${(event: KeyboardEvent) =>
          this.handleCardKeydown(event, asset, index)}
      >
        ${
          thumbnailUrl
            ? html`<img
                class="card-thumb"
                src="${thumbnailUrl}"
                alt="${description}"
                loading="lazy"
                decoding="async"
              />`
            : html`<div class="card-thumb-placeholder">
                <stellar-icon .icon=${Image}></stellar-icon>
              </div>`
        }
        <div class="card-actions">
          ${
            supportsDownload
              ? html`
                <button
                  class="card-action-btn download-btn"
                  type="button"
                  title="Download photo"
                  aria-label="Download photo"
                  @click=${(event: Event) => {
                    event.stopPropagation();
                    this.downloadAsset(asset);
                  }}
                >
                  <stellar-icon .icon=${Download}></stellar-icon>
                </button>
              `
              : html`<span></span>`
          }
          ${
            sourceUrl
              ? html`
                <a
                  class="card-action-btn source-link"
                  href="${this.appendUtm(sourceUrl)}"
                  target="_blank"
                  rel="noopener"
                  title="View photo on ${asset.sourceId === "unsplash" ? "Unsplash" : "source"}"
                  aria-label="View photo on source"
                  @click=${(event: Event) => event.stopPropagation()}
                >
                  <stellar-icon .icon=${ExternalLink}></stellar-icon>
                </a>
              `
              : null
          }
        </div>
      </li>
    `;
  }

  private renderPlaceholder() {
    return html`
      <li class="history-placeholder" aria-hidden="true">
        <stellar-icon .icon=${Image}></stellar-icon>
      </li>
    `;
  }

  private cancelScheduledLoad(): void {
    if (
      this.idleHandle !== null &&
      typeof window !== "undefined" &&
      "cancelIdleCallback" in window
    ) {
      window.cancelIdleCallback(this.idleHandle);
      this.idleHandle = null;
    }
    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private scheduleDeferredLoad(): void {
    this.cancelScheduledLoad();

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      this.idleHandle = window.requestIdleCallback(
        () => {
          void this.loadThumbnails();
        },
        { timeout: 2000 },
      );
    } else {
      this.timeoutHandle = Number(
        setTimeout(() => {
          void this.loadThumbnails();
        }, 500),
      );
    }
  }

  private async loadThumbnails(): Promise<void> {
    const generation = ++this.loadGeneration;
    const assets =
      this.historyAssets.length > 0
        ? this.historyAssets
        : this.activeAsset
          ? [this.activeAsset]
          : [];

    if (assets.length === 0) return;

    try {
      const results = await Promise.all(
        assets.map(async (asset) => {
          const existing = this.thumbnailUrls.get(asset.cacheKey);
          if (existing) {
            return { key: asset.cacheKey, url: existing, isNew: false };
          }

          const response = await readCachedImage(asset.cacheKey);
          if (response) {
            const blob = await response.blob();
            return {
              key: asset.cacheKey,
              url: URL.createObjectURL(blob),
              isNew: true,
            };
          }

          return null;
        }),
      );

      if (generation !== this.loadGeneration || !this.isConnected) {
        for (const item of results) {
          if (item?.isNew && item.url.startsWith("blob:")) {
            URL.revokeObjectURL(item.url);
          }
        }
        return;
      }

      const nextUrls = new Map<string, string>();
      for (const item of results) {
        if (item) {
          nextUrls.set(item.key, item.url);
        }
      }

      for (const [key, url] of this.thumbnailUrls) {
        if (!nextUrls.has(key) && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      }

      this.thumbnailUrls = nextUrls;
    } catch {
      // Abort gracefully
    }
  }

  private cleanupThumbnailUrls(): void {
    for (const url of this.thumbnailUrls.values()) {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    }

    this.thumbnailUrls.clear();
  }

  private appendUtm(rawUrl: string): string {
    const separator = rawUrl.includes("?") ? "&" : "?";

    return `${rawUrl}${separator}${UTM_PARAMS}`;
  }

  private selectAsset(asset: BackgroundAsset, index: number): void {
    this.dispatchEvent(
      new CustomEvent("select-photo", {
        detail: { asset, index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private downloadAsset(asset: BackgroundAsset): void {
    this.dispatchEvent(
      new CustomEvent("download-photo", {
        detail: { asset },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleCardKeydown(
    event: KeyboardEvent,
    asset: BackgroundAsset,
    index: number,
  ): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.selectAsset(asset, index);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-history-panel": HistoryPanel;
  }
}
