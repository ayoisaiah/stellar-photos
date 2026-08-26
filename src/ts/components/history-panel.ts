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

  override connectedCallback(): void {
    super.connectedCallback();

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(this.handleStorageChange);
    }

    if (this.open) {
      void this.loadHistory();
    } else if (this.ready) {
      this.scheduleDeferredLoad();
    }
  }

  override disconnectedCallback(): void {
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.handleStorageChange);
    }

    this.cleanupThumbnailUrls();
    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (changedProperties.has("open") && this.open) {
      void this.loadHistory();
    } else if (
      (changedProperties.has("ready") && this.ready) ||
      (this.ready && changedProperties.has("activeAsset"))
    ) {
      this.scheduleDeferredLoad();
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

  private async loadHistory(): Promise<void> {
    const generation = ++this.loadGeneration;

    try {
      const state = await readHistory();
      if (generation !== this.loadGeneration) return;

      const rawAssets =
        state.history.length > 0
          ? state.history
          : this.activeAsset
            ? [this.activeAsset]
            : [];

      const nextUrls = new Map<string, string>();

      for (const asset of rawAssets) {
        const existing = this.thumbnailUrls.get(asset.cacheKey);
        if (existing) {
          nextUrls.set(asset.cacheKey, existing);
          continue;
        }

        const response = await readCachedImage(asset.cacheKey);
        if (generation !== this.loadGeneration) return;

        if (response) {
          const blob = await response.blob();
          if (generation !== this.loadGeneration) return;

          nextUrls.set(asset.cacheKey, URL.createObjectURL(blob));
        } else {
          const payload = asset.sourcePayload as
            | { imageUrl?: string; fullImageUrl?: string }
            | undefined;

          if (payload?.imageUrl) {
            nextUrls.set(asset.cacheKey, payload.imageUrl);
          }
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
      // Graceful fallback
    }
  }

  private scheduleDeferredLoad(): void {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => void this.loadHistory(), {
        timeout: 1000,
      });
    } else {
      setTimeout(() => void this.loadHistory(), 100);
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
      if (this.open) {
        void this.loadHistory();
      } else if (this.ready) {
        this.scheduleDeferredLoad();
      }
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
