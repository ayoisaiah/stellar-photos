import { Check, ChevronDown, X } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/settings-drawer.css?inline";
import {
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  setActiveImageSourceIds,
  setDisplaySettings,
  setPhotoFrequency,
} from "../settings";
import { listImageSources } from "../sources";
import {
  listStoredFolderRecords,
  verifyHandlePermission,
} from "../sources/local-db";
import { readFrequency, renderFrequencySelector } from "./settings-form";
import { hasSourceSettings, renderSourceSettings } from "./source-settings";
import "./lucide-icon";

import type { DisplaySettings, PhotoDisplayMode } from "../settings";
import type { PhotoFrequency } from "../sources/photo-frequency";

declare const __APP_VERSION__: string;

const SOURCE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  unsplash: "Photography from the Unsplash community",
  earthview: "Satellite imagery from around the world",
  smithsonian: "High-resolution open access museum collections",
  local: "Photographs from your local device",
};

function getWebstoreReviewUrl(): string {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

  if (/firefox/i.test(userAgent)) {
    return "https://addons.mozilla.org/en-US/firefox/addon/stellar-photos/reviews/";
  }

  if (/\bEdg\b|\bEdge\//i.test(userAgent)) {
    return "https://microsoftedge.microsoft.com/addons/detail/stellar-photos/oifbedjcmofkjgmjakgbppkocdfpjpjg";
  }

  return "https://chromewebstore.google.com/detail/stellar-photos/dgjeipdebjigeaanhogpdjdjigogpjmo/reviews";
}

@customElement("stellar-settings-drawer")
class SettingsDrawer extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true })
  accessor open = false;

  @property({ attribute: false })
  accessor activeSourceIds: string[] = [
    ...DEFAULT_CORE_SETTINGS.activeSourceIds,
  ];

  @property({ attribute: false })
  accessor photoFrequency: PhotoFrequency =
    DEFAULT_CORE_SETTINGS.photoFrequency;

  @property({ attribute: false })
  accessor displaySettings: DisplaySettings = DEFAULT_DISPLAY_SETTINGS;

  @state()
  private accessor localSourceIds: string[] = [
    ...DEFAULT_CORE_SETTINGS.activeSourceIds,
  ];

  @state()
  private accessor localPhotoFrequency: PhotoFrequency =
    DEFAULT_CORE_SETTINGS.photoFrequency;

  @state()
  private accessor expandedSourceIds: Set<string> = new Set();

  @state()
  private accessor localDisplaySettings: DisplaySettings =
    DEFAULT_DISPLAY_SETTINGS;

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (changedProperties.has("activeSourceIds")) {
      this.localSourceIds = this.activeSourceIds;
    }

    if (changedProperties.has("photoFrequency")) {
      this.localPhotoFrequency = this.photoFrequency;
    }

    if (changedProperties.has("open") && this.open) {
      this.localSourceIds = this.activeSourceIds;
      this.localPhotoFrequency = this.photoFrequency;
    }

    if (changedProperties.has("displaySettings")) {
      this.localDisplaySettings = this.displaySettings;
    }
  }

  override disconnectedCallback(): void {
    window.removeEventListener("keydown", this.handleKeydown);
    super.disconnectedCallback();
  }

  override render() {
    const sources = listImageSources();

    return html`
      <button
        class="backdrop"
        type="button"
        aria-label="Close settings"
        tabindex=${this.open ? 0 : -1}
        @click=${this.close}
      ></button>
      <aside
        role="dialog"
        aria-hidden=${!this.open}
        aria-labelledby="settings-title"
      >
        <header>
          <div>
            <p>Stellar Photos</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            class="close"
            type="button"
            aria-label="Close settings"
            @click=${this.close}
          >
            <stellar-icon .icon=${X}></stellar-icon>
          </button>
        </header>
        <div class="content">
          <section>
            <div class="section-heading">
              <h3>Photo sources</h3>
            </div>
            <p class="source-help">
              Choose one or more sources Stellar Photos pulls backgrounds from.
            </p>
            <div class="source-list">
              ${sources.map((source) => {
                const isActive = this.localSourceIds.includes(source.id);
                const isOnlyActive =
                  isActive && this.localSourceIds.length === 1;
                const canConfigure = hasSourceSettings(source.id);
                const isExpanded = this.expandedSourceIds.has(source.id);

                return html`
                  <div class="source-card ${isActive ? "active" : ""}">
                    <div class="source-card-header">
                      <label class="source-toggle-label">
                        <input
                          type="checkbox"
                          .checked=${isActive}
                          ?disabled=${isOnlyActive}
                          @change=${() => this.toggleSource(source.id)}
                        />
                        <span class="checkbox-control" aria-hidden="true">
                          <stellar-icon .icon=${Check}></stellar-icon>
                        </span>
                        <span>
                          <strong>${source.name}</strong>
                          <small>${SOURCE_DESCRIPTIONS[source.id] ?? ""}</small>
                        </span>
                      </label>
                      ${
                        canConfigure
                          ? html`
                            <button
                              type="button"
                              class="source-expand-btn ${isExpanded ? "expanded" : ""}"
                              aria-label="${isExpanded ? "Collapse" : "Expand"} ${source.name} settings"
                              aria-expanded=${isExpanded}
                              @click=${() => this.toggleExpand(source.id)}
                            >
                              <stellar-icon .icon=${ChevronDown}></stellar-icon>
                            </button>
                          `
                          : null
                      }
                    </div>
                    ${
                      canConfigure && isExpanded && this.open
                        ? html`
                          <div class="source-card-body">
                            ${renderSourceSettings(source.id)}
                          </div>
                        `
                        : null
                    }
                  </div>
                `;
              })}
            </div>
          </section>
          <div class="divider"></div>
          <section>
            <div class="section-heading">
              <h3>Photo frequency</h3>
            </div>
            <p class="source-help display-help">
              Choose how often Stellar Photos displays a new photo.
            </p>
            ${renderFrequencySelector(
              this.localPhotoFrequency,
              false,
              this.changeFrequency,
            )}
          </section>
          <div class="divider"></div>
          <section>
            <div class="section-heading">
              <h3>Display</h3>
            </div>
            <p class="source-help display-help">
              Choose how photos fit your screen based on their orientation.
            </p>

            <fieldset>
              <legend>Landscape photos</legend>
              <div class="options">
                <label class="radio-label">
                  <input
                    type="radio"
                    name="landscapeMode"
                    value="cover"
                    .checked=${this.localDisplaySettings.landscapeMode === "cover"}
                    @change=${this.changeLandscapeMode}
                  />
                  <span class="control" aria-hidden="true"></span>
                  <span>
                    <strong>Cover</strong>
                    <small>Fills screen (centered, cropped edges)</small>
                  </span>
                </label>
                <label class="radio-label">
                  <input
                    type="radio"
                    name="landscapeMode"
                    value="contain-blur"
                    .checked=${this.localDisplaySettings.landscapeMode === "contain-blur"}
                    @change=${this.changeLandscapeMode}
                  />
                  <span class="control" aria-hidden="true"></span>
                  <span>
                    <strong>Contain with blur</strong>
                    <small>Shows full photo with blurred background</small>
                  </span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Portrait photos</legend>
              <div class="options">
                <label class="radio-label">
                  <input
                    type="radio"
                    name="portraitMode"
                    value="contain-blur"
                    .checked=${this.localDisplaySettings.portraitMode === "contain-blur"}
                    @change=${this.changePortraitMode}
                  />
                  <span class="control" aria-hidden="true"></span>
                  <span>
                    <strong>Contain with blur</strong>
                    <small>Shows full photo with blurred background</small>
                  </span>
                </label>
                <label class="radio-label">
                  <input
                    type="radio"
                    name="portraitMode"
                    value="cover"
                    .checked=${this.localDisplaySettings.portraitMode === "cover"}
                    @change=${this.changePortraitMode}
                  />
                  <span class="control" aria-hidden="true"></span>
                  <span>
                    <strong>Cover</strong>
                    <small>Fills screen (centered, cropped edges)</small>
                  </span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Motion</legend>
              <div class="options">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    name="motion"
                    .checked=${this.localDisplaySettings.motion}
                    @change=${this.toggleMotion}
                  />
                  <span class="checkbox-control" aria-hidden="true">
                    <stellar-icon .icon=${Check}></stellar-icon>
                  </span>
                  <span>
                    <strong>Subtle motion</strong>
                    <small>Starts zoomed in and slowly zooms out</small>
                  </span>
                </label>
              </div>
            </fieldset>
          </section>
          <div class="divider"></div>
          <section>
            <div class="section-heading">
              <h3>About</h3>
              <span class="version-badge">v${__APP_VERSION__}</span>
            </div>
            <p class="about-text">
              Stellar Photos is created by
              <a
                href="https://github.com/ayoisaiah"
                target="_blank"
                rel="noopener"
              >Ayooluwa Isaiah</a>
              and released under the
              <a
                href="https://github.com/ayoisaiah/stellar-photos/blob/master/LICENCE"
                target="_blank"
                rel="noopener"
              >MIT License</a>.
            </p>
            <div class="about-links">
              <a
                class="about-link"
                href="${getWebstoreReviewUrl()}"
                target="_blank"
                rel="noopener"
              >
                Write a review
              </a>
              <span class="dot" aria-hidden="true">•</span>
              <a
                class="about-link"
                href="https://github.com/ayoisaiah/stellar-photos"
                target="_blank"
                rel="noopener"
              >
                GitHub
              </a>
              <span class="dot" aria-hidden="true">•</span>
              <a
                class="about-link"
                href="https://github.com/ayoisaiah/stellar-photos/releases"
                target="_blank"
                rel="noopener"
              >
                Releases
              </a>
              <span class="dot" aria-hidden="true">•</span>
              <a
                class="about-link"
                href="https://github.com/ayoisaiah/stellar-photos/issues"
                target="_blank"
                rel="noopener"
              >
                Report issue
              </a>
            </div>
          </section>
        </div>
      </aside>
    `;
  }

  protected override updated(
    changedProperties: Map<PropertyKey, unknown>,
  ): void {
    if (!changedProperties.has("open")) return;

    if (!this.open) {
      window.removeEventListener("keydown", this.handleKeydown);
      return;
    }

    window.addEventListener("keydown", this.handleKeydown);
    this.renderRoot.querySelector<HTMLButtonElement>(".close")?.focus();
  }

  private close = (): void => {
    this.dispatchEvent(new CustomEvent("close-settings"));
  };

  private changeFrequency = async (event: Event): Promise<void> => {
    const nextFrequency = readFrequency(event);
    if (!nextFrequency || nextFrequency === this.localPhotoFrequency) return;

    this.localPhotoFrequency = nextFrequency;
    await setPhotoFrequency(nextFrequency);

    this.dispatchEvent(
      new CustomEvent("frequency-changed", {
        detail: { frequency: nextFrequency },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private toggleExpand = (sourceId: string): void => {
    const next = new Set(this.expandedSourceIds);
    if (next.has(sourceId)) {
      next.delete(sourceId);
    } else {
      next.add(sourceId);
    }
    this.expandedSourceIds = next;
  };

  private toggleSource = async (sourceId: string): Promise<void> => {
    const isActive = this.localSourceIds.includes(sourceId);

    if (isActive && this.localSourceIds.length === 1) return;

    let nextSourceIds: string[];
    if (isActive) {
      nextSourceIds = this.localSourceIds.filter((id) => id !== sourceId);
    } else {
      if (sourceId === "local") {
        const records = await listStoredFolderRecords().catch(() => []);
        if (records.length > 0) {
          for (const record of records) {
            await verifyHandlePermission(record.handle, "read");
          }
        }
      }
      nextSourceIds = [...this.localSourceIds, sourceId];
    }

    this.localSourceIds = nextSourceIds;
    await setActiveImageSourceIds(nextSourceIds);

    this.dispatchEvent(
      new CustomEvent("active-sources-changed", {
        detail: { sourceIds: nextSourceIds },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private changeLandscapeMode = async (event: Event): Promise<void> => {
    const target = event.currentTarget as HTMLInputElement;
    const mode = target.value as PhotoDisplayMode;
    if (mode !== "cover" && mode !== "contain-blur") return;

    this.localDisplaySettings = {
      ...this.localDisplaySettings,
      landscapeMode: mode,
    };

    await setDisplaySettings({ landscapeMode: mode });

    this.dispatchEvent(
      new CustomEvent("display-settings-changed", {
        detail: { displaySettings: this.localDisplaySettings },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private changePortraitMode = async (event: Event): Promise<void> => {
    const target = event.currentTarget as HTMLInputElement;
    const mode = target.value as PhotoDisplayMode;
    if (mode !== "cover" && mode !== "contain-blur") return;

    this.localDisplaySettings = {
      ...this.localDisplaySettings,
      portraitMode: mode,
    };

    await setDisplaySettings({ portraitMode: mode });

    this.dispatchEvent(
      new CustomEvent("display-settings-changed", {
        detail: { displaySettings: this.localDisplaySettings },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private toggleMotion = async (event: Event): Promise<void> => {
    const target = event.currentTarget as HTMLInputElement;
    const motion = target.checked;

    this.localDisplaySettings = {
      ...this.localDisplaySettings,
      motion,
    };

    await setDisplaySettings({ motion });

    this.dispatchEvent(
      new CustomEvent("display-settings-changed", {
        detail: { displaySettings: this.localDisplaySettings },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.open) this.close();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-settings-drawer": SettingsDrawer;
  }
}

export { getWebstoreReviewUrl, SettingsDrawer };
