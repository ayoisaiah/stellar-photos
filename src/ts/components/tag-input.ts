import { X } from "@lucide/icons";
import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import styles from "../../css/components/tag-input.css?inline";
import "./lucide-icon";

@customElement("stellar-tag-input")
class StellarTagInput extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ type: String })
  accessor value = "";

  @property({ type: String })
  accessor placeholder = "";

  @property({ type: Boolean })
  accessor disabled = false;

  @property({ type: String })
  accessor inputId = "";

  @state()
  private accessor inputValue = "";

  @query(".native-input")
  private accessor inputElement!: HTMLInputElement;

  private get tags(): string[] {
    return parseTags(this.value);
  }

  override render() {
    const tags = this.tags;

    return html`
      <div
        class="tag-input-container ${this.disabled ? "disabled" : ""}"
        @click=${this.focusInput}
      >
        ${tags.map(
          (tag, index) => html`
            <span class="tag">
              <span class="tag-label">${tag}</span>
              <button
                type="button"
                class="tag-remove"
                aria-label="Remove ${tag}"
                ?disabled=${this.disabled}
                @click=${(event: MouseEvent) => {
                  event.stopPropagation();
                  this.removeTag(index);
                }}
              >
                <stellar-icon .icon=${X}></stellar-icon>
              </button>
            </span>
          `,
        )}
        <input
          id=${this.inputId || nothing}
          type="text"
          class="native-input"
          placeholder=${tags.length === 0 ? this.placeholder : ""}
          .value=${this.inputValue}
          ?disabled=${this.disabled}
          @keydown=${this.handleKeyDown}
          @input=${this.handleInput}
          @blur=${this.handleBlur}
        />
      </div>
    `;
  }

  private focusInput = (): void => {
    if (!this.disabled) {
      this.inputElement?.focus();
    }
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "," || event.key === "Enter") {
      event.preventDefault();
      this.commitInput();
      return;
    }

    if (
      event.key === "Backspace" &&
      this.inputValue === "" &&
      this.tags.length > 0
    ) {
      event.preventDefault();
      this.removeTag(this.tags.length - 1);
    }
  };

  private handleInput = (event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    const value = target.value;

    if (value.includes(",")) {
      const parts = value.split(",");
      const toAdd = parts.slice(0, -1);
      const remaining = parts[parts.length - 1] ?? "";

      this.addTags(toAdd);
      this.inputValue = remaining;
      target.value = remaining;
      return;
    }

    this.inputValue = value;
  };

  private handleBlur = (): void => {
    if (this.inputValue.trim()) {
      this.commitInput();
    }
  };

  private commitInput(): void {
    const raw = this.inputValue.trim();

    if (!raw) return;

    this.addTags([raw]);
    this.inputValue = "";
  }

  private addTags(candidates: string[]): void {
    const current = this.tags;
    const next = [...current];

    for (const item of candidates) {
      const clean = item.trim();
      if (clean && !next.includes(clean)) {
        next.push(clean);
      }
    }

    if (next.length !== current.length) {
      this.emitChange(next.join(", "));
    }
  }

  private removeTag(index: number): void {
    const current = this.tags;
    const next = current.filter((_, i) => i !== index);

    this.emitChange(next.join(", "));
  }

  private emitChange(value: string): void {
    this.value = value;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

function parseTags(value?: string | null): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-tag-input": StellarTagInput;
  }
}

export { parseTags, StellarTagInput };
