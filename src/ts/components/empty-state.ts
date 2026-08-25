import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";

import styles from "../../css/components/empty-state.css?inline";

type EmptyStatePhase = "loading" | "ready" | "error";

@customElement("stellar-empty-state")
class EmptyState extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ reflect: true })
  accessor phase: EmptyStatePhase = "loading";

  override render() {
    const isError = this.phase === "error";

    return html`
      <main
        aria-atomic="true"
        aria-busy=${this.phase === "loading"}
        aria-live="polite"
      >
        <div class="mark" aria-hidden="true">
          <span class="spark"></span>
        </div>
        <h1>
          ${
            isError
              ? "We couldn’t find a photo just yet."
              : "Your first photo is on its way."
          }
        </h1>
        <p>
          ${
            isError
              ? "Check your connection and try again."
              : "We’re finding something beautiful for your new tab. This first one may take a moment—after that, your photos will be ready when you are."
          }
        </p>
        ${
          isError
            ? html`<button type="button" @click=${this.retry}>Try again</button>`
            : html`<div
              class="progress"
              role="progressbar"
              aria-label="Loading your first photo"
            ></div>`
        }
      </main>
    `;
  }

  private retry(): void {
    this.dispatchEvent(new CustomEvent("retry"));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-empty-state": EmptyState;
  }
}

export type { EmptyStatePhase };
