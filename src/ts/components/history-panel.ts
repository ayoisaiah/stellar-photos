import { Download, ExternalLink, Image } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/history-panel.css?inline";
import type { BackgroundAsset } from "../assets";
import { attributionUrl } from "../attribution";
import { readImage } from "../image-reader";
import { getImageSource } from "../sources";
import "./lucide-icon";

@customElement("stellar-history-panel")
class HistoryPanel extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true })
  accessor open = false;

  @property({ attribute: false })
  accessor activeAsset: BackgroundAsset | null = null;

  @property({ attribute: false })
  accessor historyAssets: BackgroundAsset[] = [];

  @state()
  private accessor thumbnailUrls = new Map<string, string>();

  private loadGeneration = 0;

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.open) {
      void this.loadThumbnails();
    }
  }

  override disconnectedCallback(): void {
    this.loadGeneration += 1;
    this.cleanupThumbnailUrls();
    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (
      changedProperties.has("open") ||
      changedProperties.has("historyAssets") ||
      changedProperties.has("activeAsset")
    ) {
      if (this.open) {
        void this.loadThumbnails();
      }
    }
  }

  override render() {
    const rawAssets =
      this.historyAssets.length > 0
        ? this.historyAssets
        : this.activeAsset
          ? [this.activeAsset]
          : [];
    const reversedAssets = [...rawAssets].reverse();

    return html`
      <ul
        class="history-list"
        role="region"
        aria-label="Photo history"
      >
        ${reversedAssets.map((asset) => this.renderCard(asset))}
      </ul>
    `;
  }

  private renderCard(asset: BackgroundAsset) {
    const thumbnailUrl = this.thumbnailUrls.get(asset.cacheKey);
    const description = asset.description || "photo";
    const source = getImageSource(asset.sourceId);
    const sourceUrl = asset.attribution?.sourceUrl ?? "";
    const sourceTitle = source
      ? `View on ${source.name}`
      : "View photo on source";
    const supportsDownload = Boolean(source?.supportsDownload);
    const isActive =
      this.activeAsset !== null &&
      this.activeAsset.cacheKey === asset.cacheKey &&
      this.activeAsset.createdAt === asset.createdAt;

    return html`
      <li
        class="history-card ${isActive ? "active" : ""}"
        data-cache-key="${asset.cacheKey}"
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
                  href="${attributionUrl(sourceUrl, asset.sourceId)}"
                  target="_blank"
                  rel="noopener"
                  title="${sourceTitle}"
                  aria-label="${sourceTitle}"
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

          const response = await readImage(asset.cacheKey, true);

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
          if (item?.isNew) {
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
        if (!nextUrls.has(key)) {
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
      URL.revokeObjectURL(url);
    }

    this.thumbnailUrls.clear();
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
