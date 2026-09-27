import { Check, ChevronDown, X } from "@lucide/icons";
import { LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { html, unsafeStatic } from "lit/static-html.js";
import styles from "../../css/components/settings-drawer.css?inline";
import formStyles from "../../css/components/settings-form.css?inline";
import {
  DEFAULT_CORE_SETTINGS,
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_MODE_OPTIONS,
  setActiveImageSourceIds,
  setDisplaySettings,
  setPhotoFrequency,
} from "../settings";
import { listImageSources } from "../sources";
import {
  listStoredFolderRecords,
  verifyHandlePermission,
} from "../sources/local-db";
import {
  readFrequency,
  renderFrequencySelector,
  renderRadioGroup,
} from "./settings-form";
import "./local-settings";
import "./lucide-icon";
import "./smithsonian-settings";
import "./unsplash-settings";

import type { DisplaySettings } from "../settings";
import type { PhotoFrequency } from "../sources/photo-frequency";
import type { SourceHealthMap } from "../sources/source-health";

declare const __APP_VERSION__: string;

function getWebstoreReviewUrl(): string {
  const userAgent = navigator.userAgent;

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
  static override styles = [unsafeCSS(formStyles), unsafeCSS(styles)];

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

  @property({ attribute: false })
  accessor sourceHealthMap: SourceHealthMap = {};

  @state()
  private accessor expandedSourceIds: Set<string> = new Set();

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
                const isActive = this.activeSourceIds.includes(source.id);
                const isOnlyActive =
                  isActive && this.activeSourceIds.length === 1;
                const canConfigure = Boolean(source.settingsTag);
                const isExpanded = this.expandedSourceIds.has(source.id);
                const error = isActive
                  ? this.sourceHealthMap[source.id]
                  : undefined;
                const isDown = Boolean(error);
                const tag = source.settingsTag
                  ? unsafeStatic(source.settingsTag)
                  : null;

                return html`
                  <div class="source-card ${isActive ? "active" : ""} ${isDown ? "source-down" : ""}">
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
                        <div class="source-text-block">
                          <strong>${source.name}</strong>
                          <small class="source-desc">${source.description}</small>
                          ${error ? html`<p class="source-error">${error}</p>` : null}
                        </div>
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
                      canConfigure && isExpanded && this.open && tag
                        ? html`
                          <div class="source-card-body">
                            <${tag}></${tag}>
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
              this.photoFrequency,
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

            ${this.renderDisplayModeFieldset("Landscape photos", "landscapeMode")}
            ${this.renderDisplayModeFieldset("Portrait photos", "portraitMode")}

            <fieldset>
              <legend>Motion</legend>
              <div class="options">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    name="motion"
                    .checked=${this.displaySettings.motion}
                    @change=${(e: Event) =>
                      void this.updateDisplay({
                        motion: (e.currentTarget as HTMLInputElement).checked,
                      })}
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
    if (changedProperties.has("open") && this.open) {
      this.renderRoot.querySelector<HTMLButtonElement>(".close")?.focus();
    }
  }

  private close = (): void => {
    this.dispatchEvent(new CustomEvent("close-settings"));
  };

  private changeFrequency = async (event: Event): Promise<void> => {
    const nextFrequency = readFrequency(event);
    if (!nextFrequency || nextFrequency === this.photoFrequency) return;

    await setPhotoFrequency(nextFrequency);
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
    const isActive = this.activeSourceIds.includes(sourceId);

    if (isActive && this.activeSourceIds.length === 1) return;

    let nextSourceIds: string[];
    if (isActive) {
      nextSourceIds = this.activeSourceIds.filter((id) => id !== sourceId);
    } else {
      if (sourceId === "local") {
        const records = await listStoredFolderRecords().catch(() => []);
        if (records.length > 0) {
          for (const record of records) {
            await verifyHandlePermission(record.handle, "read");
          }
        }
      }
      nextSourceIds = [...this.activeSourceIds, sourceId];
    }

    await setActiveImageSourceIds(nextSourceIds);
  };

  private updateDisplay = async (
    patch: Partial<Omit<DisplaySettings, "version">>,
  ): Promise<void> => {
    await setDisplaySettings(patch);
  };

  private renderDisplayModeFieldset(
    legend: string,
    name: "landscapeMode" | "portraitMode",
  ) {
    const currentMode = this.displaySettings[name];

    return html`
      <fieldset>
        <legend>${legend}</legend>
        ${renderRadioGroup(
          name,
          DISPLAY_MODE_OPTIONS,
          currentMode,
          (val) => void this.updateDisplay({ [name]: val }),
        )}
      </fieldset>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-settings-drawer": SettingsDrawer;
  }
}

export { getWebstoreReviewUrl, SettingsDrawer };
