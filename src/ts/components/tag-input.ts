import { Loader2, X } from "@lucide/icons";
import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import styles from "../../css/components/tag-input.css?inline";
import "./lucide-icon";

type TagValidationResult =
  | boolean
  | {
      valid: boolean;
      normalized?: string;
      error?: string;
    };

type TagValidator = (
  tag: string,
) => Promise<TagValidationResult> | TagValidationResult;

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

  @property({ attribute: false })
  accessor validate: TagValidator | null = null;

  @state()
  private accessor inputValue = "";

  @state()
  private accessor validating = false;

  @state()
  private accessor errorMessage = "";

  @query(".native-input")
  private accessor inputElement!: HTMLInputElement;

  private get tags(): string[] {
    return parseTags(this.value);
  }

  override render() {
    const tags = this.tags;
    const isBusy = this.validating;
    const hasError = Boolean(this.errorMessage);

    return html`
      <div
        class="tag-input-container ${this.disabled ? "disabled" : ""} ${hasError ? "error" : ""}"
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
                ?disabled=${this.disabled || isBusy}
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
          ?disabled=${this.disabled || isBusy}
          aria-invalid=${hasError ? "true" : "false"}
          @keydown=${this.handleKeyDown}
          @input=${this.handleInput}
          @blur=${this.handleBlur}
        />
        ${
          isBusy
            ? html`
              <span class="tag-spinner" aria-label="Validating">
                <stellar-icon class="spinning" .icon=${Loader2}></stellar-icon>
              </span>
            `
            : nothing
        }
      </div>
      ${
        hasError
          ? html`
            <p class="tag-input-error" role="alert">
              ${this.errorMessage}
            </p>
          `
          : nothing
      }
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
      void this.commitInput();
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

    if (this.errorMessage) {
      this.errorMessage = "";
    }

    if (value.includes(",")) {
      const parts = value.split(",");
      const toAdd = parts.slice(0, -1);
      const remaining = parts[parts.length - 1] ?? "";

      this.inputValue = remaining;
      target.value = remaining;
      void this.addTags(toAdd, false);
      return;
    }

    this.inputValue = value;
  };

  private handleBlur = (): void => {
    if (this.inputValue.trim()) {
      void this.commitInput();
    }
  };

  private async commitInput(): Promise<void> {
    const raw = this.inputValue.trim();

    if (!raw || this.validating) return;

    await this.addTags([raw], true);
  }

  private async addTags(
    candidates: string[],
    clearOnSuccess = false,
  ): Promise<void> {
    const rawAdditions = candidates.map((item) => item.trim()).filter(Boolean);

    if (rawAdditions.length === 0) return;

    const current = this.tags;
    const next = [...current];
    let validationError = "";
    let lastFailedCandidate = "";

    if (this.validate) {
      this.validating = true;
      this.errorMessage = "";

      try {
        for (const candidate of rawAdditions) {
          const result = await this.validate(candidate);

          if (typeof result === "boolean") {
            if (result) {
              if (!next.includes(candidate)) {
                next.push(candidate);
              }
            } else {
              validationError = `"${candidate}" is invalid.`;
              lastFailedCandidate = candidate;
            }
          } else {
            if (result.valid) {
              const tagToAdd = result.normalized ?? candidate;
              if (!next.includes(tagToAdd)) {
                next.push(tagToAdd);
              }
            } else {
              validationError = result.error || `"${candidate}" is invalid.`;
              lastFailedCandidate = candidate;
            }
          }
        }
      } catch (err) {
        validationError =
          err instanceof Error ? err.message : "Validation failed.";
      } finally {
        this.validating = false;
      }
    } else {
      for (const candidate of rawAdditions) {
        if (!next.includes(candidate)) {
          next.push(candidate);
        }
      }
    }

    this.errorMessage = validationError;

    if (!validationError && clearOnSuccess) {
      this.inputValue = "";
      if (this.inputElement) {
        this.inputElement.value = "";
      }
    } else if (validationError && clearOnSuccess && rawAdditions.length === 1) {
      this.inputValue = lastFailedCandidate;
      if (this.inputElement) {
        this.inputElement.value = lastFailedCandidate;
      }
    }

    if (next.length !== current.length) {
      this.emitChange(next.join(", "));
    }
  }

  private removeTag(index: number): void {
    const current = this.tags;
    const next = current.filter((_, i) => i !== index);

    this.errorMessage = "";
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

export type { TagValidationResult, TagValidator };
export { parseTags, StellarTagInput };
