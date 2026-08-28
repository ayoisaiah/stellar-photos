import { Camera, MapPin, X } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/photo-info.css?inline";
import { attributionUrl } from "../attribution";
import {
  fetchUnsplashPhotoDetails,
  getUnsplashPhotoInfo,
} from "../sources/unsplash";
import "./lucide-icon";

import type { BackgroundAsset } from "../assets";
import type { UnsplashInfoData } from "../sources/unsplash";

@customElement("stellar-photo-info")
class PhotoInfo extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true })
  accessor open = false;

  @property({ attribute: false })
  accessor asset: BackgroundAsset | null = null;

  @state()
  private accessor fetchedInfo: UnsplashInfoData | null = null;

  @state()
  private accessor loadingDetails = false;

  private detailsGeneration = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.detailsGeneration += 1;

    if (this.open) {
      window.addEventListener("keydown", this.handleKeyDown);
      void this.loadDetailsIfNeeded();
    }
  }

  override disconnectedCallback(): void {
    this.detailsGeneration += 1;
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("asset")) {
      this.detailsGeneration += 1;
      this.fetchedInfo = null;

      if (this.open) {
        void this.loadDetailsIfNeeded();
      }
    }

    if (changedProperties.has("open") && this.open) {
      window.addEventListener("keydown", this.handleKeyDown);
      void this.loadDetailsIfNeeded();

      void this.updateComplete.then(() => {
        this.renderRoot
          .querySelector<HTMLButtonElement>(".close-button")
          ?.focus();
      });
    } else if (changedProperties.has("open")) {
      window.removeEventListener("keydown", this.handleKeyDown);
    }
  }

  override render() {
    if (!this.asset) return null;

    const info = this.fetchedInfo ?? getUnsplashPhotoInfo(this.asset);
    const attribution = this.asset.attribution;
    const photographerName = info?.user?.name ?? attribution?.name ?? "Unknown";
    const photographerUrl = info?.user?.link || attribution?.url || "";
    const photographerImage = info?.user?.profileImage;
    const sourceUrl = attribution?.sourceUrl ?? "https://unsplash.com";

    const description = info?.description ?? this.asset.description;
    const locationName = info?.location?.name
      ? info.location.name
      : [info?.location?.city, info?.location?.country]
          .filter(Boolean)
          .join(", ");

    const exif = info?.exif;
    const cameraName =
      exif?.model && exif?.make && !exif.model.includes(exif.make)
        ? `${exif.make} ${exif.model}`
        : exif?.model || exif?.make || "—";
    const focalLength = exif?.focalLength ? `${exif.focalLength}mm` : "—";
    const aperture = exif?.aperture ? `ƒ/${exif.aperture}` : "—";
    const shutterSpeed = exif?.exposureTime ? `${exif.exposureTime}s` : "—";
    const iso =
      exif?.iso !== null && exif?.iso !== undefined ? `${exif.iso}` : "—";
    const dimensions =
      this.asset.width > 0 && this.asset.height > 0
        ? `${this.asset.width} × ${this.asset.height}`
        : "—";

    return html`
      <button
        class="backdrop"
        type="button"
        aria-label="Close photo info"
        @click=${this.close}
      ></button>
      <div
        class="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
      >
        <header>
          <h2 id="info-title">About this photo</h2>
          <button
            class="close-button"
            type="button"
            aria-label="Close photo info"
            @click=${this.close}
          >
            <stellar-icon .icon=${X}></stellar-icon>
          </button>
        </header>

        <div class="photographer-card">
          ${
            photographerImage
              ? html`<img
                  class="avatar"
                  src="${photographerImage}"
                  alt="${photographerName}"
                />`
              : null
          }
          <div class="photographer-info">
            ${
              photographerUrl
                ? html`<a
                    class="photographer-name"
                    href="${attributionUrl(photographerUrl, this.asset.sourceId)}"
                    target="_blank"
                    rel="noopener"
                  >
                    ${photographerName}
                  </a>`
                : html`<span class="photographer-name">${photographerName}</span>`
            }
            <span class="photographer-credit">
              Photo on
              <a
                href="${attributionUrl(sourceUrl, this.asset.sourceId)}"
                target="_blank"
                rel="noopener"
              >
                Unsplash
              </a>
            </span>
          </div>
        </div>

        ${
          description ? html`<p class="description">"${description}"</p>` : null
        }

        ${
          locationName
            ? html`
              <div class="location-badge">
                <stellar-icon .icon=${MapPin}></stellar-icon>
                <span>${locationName}</span>
              </div>
            `
            : null
        }

        <div class="divider"></div>

        <div class="camera-header">
          <stellar-icon .icon=${Camera}></stellar-icon>
          <span>${cameraName}</span>
        </div>

        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-label">Focal Length</span>
            <p class="spec-value">${focalLength}</p>
          </div>
          <div class="spec-item">
            <span class="spec-label">Aperture</span>
            <p class="spec-value">${aperture}</p>
          </div>
          <div class="spec-item">
            <span class="spec-label">Shutter Speed</span>
            <p class="spec-value">${shutterSpeed}</p>
          </div>
          <div class="spec-item">
            <span class="spec-label">ISO</span>
            <p class="spec-value">${iso}</p>
          </div>
          <div class="spec-item">
            <span class="spec-label">Dimensions</span>
            <p class="spec-value">${dimensions}</p>
          </div>
        </div>

        ${
          this.loadingDetails
            ? html`<p class="loading-text">Loading camera details…</p>`
            : null
        }
      </div>
    `;
  }

  private async loadDetailsIfNeeded(): Promise<void> {
    if (!this.asset || this.asset.sourceId !== "unsplash") return;

    const existing = getUnsplashPhotoInfo(this.asset);
    if (existing?.exif) return;

    const generation = this.detailsGeneration;
    const currentAsset = this.asset;

    this.loadingDetails = true;

    try {
      const details = await fetchUnsplashPhotoDetails(currentAsset);
      if (
        this.isConnected &&
        this.detailsGeneration === generation &&
        this.asset === currentAsset
      ) {
        if (details) {
          this.fetchedInfo = details;
        }
      }
    } finally {
      if (this.detailsGeneration === generation) {
        this.loadingDetails = false;
      }
    }
  }

  private close = (): void => {
    this.dispatchEvent(new CustomEvent("close-info"));
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.open) {
      this.close();
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-photo-info": PhotoInfo;
  }
}

export { PhotoInfo };
