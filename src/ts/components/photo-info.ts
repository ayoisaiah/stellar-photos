import { Camera, Globe, MapPin, X } from "@lucide/icons";
import { html, LitElement, type TemplateResult, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/photo-info.css?inline";
import type { BackgroundAsset } from "../assets";
import { attributionUrl } from "../attribution";
import {
  type EarthViewDetailsData,
  fetchEarthViewDetails,
} from "../sources/earthview";
import {
  fetchUnsplashPhotoDetails,
  getUnsplashPhotoInfo,
  type UnsplashInfoData,
} from "../sources/unsplash";
import "./lucide-icon";

interface SpecItem {
  label: string;
  value: string;
}

interface PhotographerCardParams {
  avatar?: string | null;
  name: string;
  nameUrl?: string;
  creditPrefix: string;
  sourceName: string;
  sourceUrl: string;
  sourceId: string;
}

function formatCoordinates(lat?: number, lng?: number): string {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return "—";
  }

  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";

  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

function formatElevation(meters?: number): string {
  if (typeof meters !== "number" || !Number.isFinite(meters)) return "—";

  return `${Math.round(meters).toLocaleString()} m`;
}

function formatDimensions(width?: number, height?: number): string {
  if (!width || !height || width <= 0 || height <= 0) return "—";

  return `${width} × ${height}`;
}

function renderPhotographerCard(
  params: PhotographerCardParams,
): TemplateResult {
  return html`
    <div class="photographer-card">
      ${
        params.avatar
          ? html`<img
              class="avatar"
              src="${params.avatar}"
              alt="${params.name}"
            />`
          : null
      }
      <div class="photographer-info">
        ${
          params.nameUrl
            ? html`<a
                class="photographer-name"
                href="${attributionUrl(params.nameUrl, params.sourceId)}"
                target="_blank"
                rel="noopener"
              >
                ${params.name}
              </a>`
            : html`<span class="photographer-name">${params.name}</span>`
        }
        <span class="photographer-credit">
          ${params.creditPrefix}
          <a
            href="${attributionUrl(params.sourceUrl, params.sourceId)}"
            target="_blank"
            rel="noopener"
          >
            ${params.sourceName}
          </a>
        </span>
      </div>
    </div>
  `;
}

function renderLocationBadge(location: string | null): TemplateResult | null {
  if (!location) return null;

  return html`
    <div class="location-badge">
      <stellar-icon .icon=${MapPin}></stellar-icon>
      <span>${location}</span>
    </div>
  `;
}

function renderSpecsGrid(
  icon: unknown,
  title: string,
  specs: SpecItem[],
): TemplateResult {
  return html`
    <div class="camera-header">
      <stellar-icon .icon=${icon}></stellar-icon>
      <span>${title}</span>
    </div>

    <div class="specs-grid">
      ${specs.map(
        (spec) => html`
          <div class="spec-item">
            <span class="spec-label">${spec.label}</span>
            <p class="spec-value">${spec.value}</p>
          </div>
        `,
      )}
    </div>
  `;
}

@customElement("stellar-photo-info")
class PhotoInfo extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true })
  accessor open = false;

  @property({ attribute: false })
  accessor asset: BackgroundAsset | null = null;

  @state()
  private accessor fetchedUnsplashInfo: UnsplashInfoData | null = null;

  @state()
  private accessor fetchedEarthViewInfo: EarthViewDetailsData | null = null;

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
      this.fetchedUnsplashInfo = null;
      this.fetchedEarthViewInfo = null;

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

    const isEarthView = this.asset.sourceId === "earthview";

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
          <h2 id="info-title">
            ${isEarthView ? "About this view" : "About this photo"}
          </h2>
          <button
            class="close-button"
            type="button"
            aria-label="Close photo info"
            @click=${this.close}
          >
            <stellar-icon .icon=${X}></stellar-icon>
          </button>
        </header>

        ${
          isEarthView
            ? this.renderEarthView(this.asset)
            : this.renderPhoto(this.asset)
        }

        ${
          this.loadingDetails
            ? html`<p class="loading-text">
                Loading ${isEarthView ? "satellite" : "camera"} details…
              </p>`
            : null
        }
      </div>
    `;
  }

  private renderEarthView(asset: BackgroundAsset) {
    const details = this.fetchedEarthViewInfo;
    const geocode = details?.geocode;
    const landmark = geocode?.establishment || geocode?.route || null;
    const localityParts = [
      geocode?.locality,
      geocode?.administrative_area_level_2,
      geocode?.administrative_area_level_1,
      geocode?.country,
    ].filter(Boolean);
    const localityText =
      localityParts.length > 0
        ? localityParts.join(", ")
        : asset.description || "Earth";
    const primaryName = landmark || localityText;
    const secondaryLocation =
      landmark && localityText !== landmark ? localityText : null;
    const mapUrl =
      (details?.lat !== undefined && details?.lng !== undefined
        ? `https://www.google.com/maps/@${details.lat},${details.lng},${details.zoom || 12}z/data=!3m1!1e3`
        : asset.attribution?.url) ||
      asset.attribution?.url ||
      asset.attribution?.sourceUrl ||
      "https://earth.google.com/";
    const satelliteProvider =
      details?.attribution || "Google Earth View Satellite Imagery";

    const specs: SpecItem[] = [
      {
        label: "Coordinates",
        value: formatCoordinates(details?.lat, details?.lng),
      },
      { label: "Elevation", value: formatElevation(details?.elevation) },
      { label: "Zoom Level", value: details?.zoom ? `${details.zoom}z` : "—" },
      {
        label: "Dimensions",
        value: formatDimensions(asset.width, asset.height),
      },
    ];

    return html`
      ${renderPhotographerCard({
        name: primaryName,
        nameUrl: mapUrl,
        creditPrefix: "Satellite imagery on",
        sourceName: "Google Earth View",
        sourceUrl: mapUrl,
        sourceId: asset.sourceId,
      })}

      ${renderLocationBadge(secondaryLocation)}

      <p class="description">${satelliteProvider}</p>

      <div class="divider"></div>

      ${renderSpecsGrid(Globe, "Satellite & Location Details", specs)}
    `;
  }

  private renderPhoto(asset: BackgroundAsset) {
    const info =
      asset.sourceId === "unsplash"
        ? (this.fetchedUnsplashInfo ?? getUnsplashPhotoInfo(asset))
        : null;
    const attribution = asset.attribution;
    const photographerName = info?.user?.name ?? attribution?.name ?? "Unknown";
    const photographerUrl = info?.user?.link || attribution?.url || "";
    const sourceUrl = attribution?.sourceUrl ?? "https://unsplash.com";
    const sourceName =
      asset.sourceId === "unsplash"
        ? "Unsplash"
        : (attribution?.name ?? "Source");

    const description = info?.description ?? asset.description;
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

    const specs: SpecItem[] = [
      {
        label: "Focal Length",
        value: exif?.focalLength ? `${exif.focalLength}mm` : "—",
      },
      {
        label: "Aperture",
        value: exif?.aperture ? `ƒ/${exif.aperture}` : "—",
      },
      {
        label: "Shutter Speed",
        value: exif?.exposureTime ? `${exif.exposureTime}s` : "—",
      },
      {
        label: "ISO",
        value:
          exif?.iso !== null && exif?.iso !== undefined ? `${exif.iso}` : "—",
      },
      {
        label: "Dimensions",
        value: formatDimensions(asset.width, asset.height),
      },
    ];

    return html`
      ${renderPhotographerCard({
        avatar: info?.user?.profileImage,
        name: photographerName,
        nameUrl: photographerUrl,
        creditPrefix: "Photo on",
        sourceName,
        sourceUrl,
        sourceId: asset.sourceId,
      })}

      ${description ? html`<p class="description">"${description}"</p>` : null}

      ${renderLocationBadge(locationName)}

      <div class="divider"></div>

      ${renderSpecsGrid(Camera, cameraName, specs)}
    `;
  }

  private async loadDetailsIfNeeded(): Promise<void> {
    if (!this.asset) return;

    const currentAsset = this.asset;
    const generation = this.detailsGeneration;

    if (currentAsset.sourceId === "unsplash") {
      if (
        this.fetchedUnsplashInfo ||
        getUnsplashPhotoInfo(currentAsset)?.exif
      ) {
        return;
      }

      await this.fetchDetails(generation, async () => {
        const details = await fetchUnsplashPhotoDetails(currentAsset);
        if (
          details &&
          this.isConnected &&
          this.detailsGeneration === generation &&
          this.asset === currentAsset
        ) {
          this.fetchedUnsplashInfo = details;
        }
      });
    } else if (currentAsset.sourceId === "earthview") {
      if (this.fetchedEarthViewInfo) return;

      await this.fetchDetails(generation, async () => {
        const details = await fetchEarthViewDetails(currentAsset);
        if (
          details &&
          this.isConnected &&
          this.detailsGeneration === generation &&
          this.asset === currentAsset
        ) {
          this.fetchedEarthViewInfo = details;
        }
      });
    }
  }

  private async fetchDetails(
    generation: number,
    fetcher: () => Promise<void>,
  ): Promise<void> {
    this.loadingDetails = true;

    try {
      await fetcher();
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

export { formatCoordinates, formatDimensions, formatElevation, PhotoInfo };
