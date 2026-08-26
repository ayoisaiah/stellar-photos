import { Download, ExternalLink, Image } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/history-panel.css?inline";
import { readCachedImage } from "../cache";
import { readHistory } from "../history";
import { getImageSource } from "../sources";
import { HISTORY_STORAGE_KEY } from "../storage";
import { HISTORY_LIMIT } from "../types";
import "./lucide-icon";

import type { BackgroundAsset } from "../types";

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

  @state()
  private accessor historyAssets: BackgroundAsset[] = [];

  @state()
  private accessor thumbnailUrls = new Map<string, string>();

  private loadGeneration = 0;

  private idleHandle: number | null = null;
  private timeoutHandle: number | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(this.handleStorageChange);
    }

    if (this.open || this.ready) {
      void this.loadHistory();
    }
  }

  override disconnectedCallback(): void {
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.handleStorageChange);
    }

    this.cancelScheduledLoad();
    this.loadGeneration += 1;
    this.cleanupThumbnailUrls();
    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (changedProperties.has("open")) {
      if (this.open && this.historyAssets.length === 0) {
        void this.loadHistory();
      }
    } else if (
      changedProperties.has("ready") ||
      changedProperties.has("activeAsset")
    ) {
      if (this.ready || this.open) {
        void this.loadHistory();
      }
    }
  }

  override render() {
    const totalSlots = HISTORY_LIMIT;
    const assets = this.historyAssets;
    const placeholderCount = Math.max(0, totalSlots - assets.length);
    const placeholders = Array.from({ length: placeholderCount });

    return html`
      <ul
        class="history-list"
        role="region"
        aria-label="Photo history"
      >
        ${assets.map((asset) => this.renderCard(asset))}
        ${placeholders.map(() => this.renderPlaceholder())}
      </ul>
    `;
  }

  private renderCard(asset: BackgroundAsset) {
    const thumbnailUrl = this.thumbnailUrls.get(asset.cacheKey);
    const description = asset.description || "photo";
    const sourceUrl = asset.attribution?.sourceUrl ?? "";
    const supportsDownload = Boolean(
      getImageSource(asset.sourceId)?.supportsDownload,
    );

    return html`
      <li
        class="history-card"
        tabindex="0"
        role="button"
        aria-label="Set ${description} as background"
        @click=${() => this.selectAsset(asset)}
        @keydown=${(event: KeyboardEvent) =>
          this.handleCardKeydown(event, asset)}
      >
        ${
          thumbnailUrl
            ? html`<img
                class="card-thumb"
                src="${thumbnailUrl}"
                alt="${description}"
                loading="eager"
                decoding="sync"
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

  private async loadHistory(): Promise<void> {
    const generation = ++this.loadGeneration;

    try {
      const state = await readHistory();
      if (generation !== this.loadGeneration || !this.isConnected) {
        return;
      }

      const rawAssets =
        state.history.length > 0
          ? state.history
          : this.activeAsset
            ? [this.activeAsset]
            : [];

      const results = await Promise.all(
        rawAssets.map(async (asset) => {
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
      this.historyAssets = rawAssets;
    } catch {
      // Abort gracefully
    }
  }

  private handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (
      area === "local" &&
      (HISTORY_STORAGE_KEY in changes || "history" in changes)
    ) {
      void this.loadHistory();
    }
  };

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

  private selectAsset(asset: BackgroundAsset): void {
    this.dispatchEvent(
      new CustomEvent("select-photo", {
        detail: { asset },
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
  ): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.selectAsset(asset);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-history-panel": HistoryPanel;
  }
}
