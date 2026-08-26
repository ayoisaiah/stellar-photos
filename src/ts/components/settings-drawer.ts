// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { X } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/settings-drawer.css?inline";
import { DEFAULT_DISPLAY_SETTINGS, setDisplaySettings } from "../settings";
import { getImageSource, listImageSources } from "../sources";
import { getLocalPhotoCount } from "../sources/local-db";
import "./lucide-icon";
import { renderSourceSettings } from "./source-settings";

import type { DisplaySettings, PhotoDisplayMode } from "../settings";

export type SourceChangeState =
  | { status: "idle" }
  | { status: "switching" }
  | { status: "error"; message: string };

const imageSources = listImageSources();

@customElement("stellar-settings-drawer")
class SettingsDrawer extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true })
  accessor open = false;

  @property({ attribute: "source-id" })
  accessor sourceId = imageSources[0]?.id ?? "";

  @property({ attribute: false })
  accessor sourceChange: SourceChangeState = { status: "idle" };

  @property({ attribute: false })
  accessor displaySettings: DisplaySettings = DEFAULT_DISPLAY_SETTINGS;

  @state()
  private accessor selectedSourceId = "";

  @state()
  private accessor localDisplaySettings: DisplaySettings =
    DEFAULT_DISPLAY_SETTINGS;

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (changedProperties.has("sourceId") && !this.selectedSourceId) {
      this.selectedSourceId = this.sourceId;
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
    const currentSourceId = this.selectedSourceId || this.sourceId;
    const source = getImageSource(currentSourceId) ?? imageSources[0];
    const switching = this.sourceChange.status === "switching";
    const error =
      this.sourceChange.status === "error" ? this.sourceChange.message : "";

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
        aria-busy=${switching}
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
            <label class="source-label" for="source">Photo source</label>
            <div class="select-wrap">
              <select
                id="source"
                .value=${source?.id ?? ""}
                ?disabled=${switching}
                @change=${this.selectSource}
              >
                ${imageSources.map(
                  ({ id, name }) => html`<option value=${id}>${name}</option>`,
                )}
              </select>
            </div>
            <p class="source-help">
              Choose where Stellar Photos finds your backgrounds.
            </p>
          </section>
          <div class="divider"></div>
          <section>
            <div class="section-heading">
              <h3>${source?.name ?? "Source"}</h3>
              ${switching ? html`<span>Finding a photo…</span>` : null}
            </div>
            ${source ? renderSourceSettings(source.id) : null}
            ${error ? html`<p class="error" role="alert">${error}</p>` : null}
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

  private selectSource = async (event: Event): Promise<void> => {
    const sourceId = (event.currentTarget as HTMLSelectElement).value;

    this.selectedSourceId = sourceId;

    if (sourceId === this.sourceId) return;

    if (sourceId === "local") {
      const count = await getLocalPhotoCount().catch(() => 0);
      if (count === 0) return;
    }

    this.dispatchEvent(
      new CustomEvent("select-source", { detail: { sourceId } }),
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

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.open) this.close();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-settings-drawer": SettingsDrawer;
  }
}
