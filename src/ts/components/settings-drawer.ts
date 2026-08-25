import { X } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";

import styles from "../../css/components/settings-drawer.css?inline";
import { getImageSource, listImageSources } from "../sources";
import "./lucide-icon";
import { renderSourceSettings } from "./source-settings";

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

  override disconnectedCallback(): void {
    window.removeEventListener("keydown", this.handleKeydown);
    super.disconnectedCallback();
  }

  override render() {
    const source = getImageSource(this.sourceId) ?? imageSources[0];
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

  private selectSource = (event: Event): void => {
    const sourceId = (event.currentTarget as HTMLSelectElement).value;

    if (sourceId === this.sourceId) return;

    this.dispatchEvent(
      new CustomEvent("select-source", { detail: { sourceId } }),
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
