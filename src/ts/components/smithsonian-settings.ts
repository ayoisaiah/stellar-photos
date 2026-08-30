// biome-ignore assist/source/organizeImports: Side-effect and type imports are grouped separately per AGENTS.md.
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import styles from "../../css/components/settings-form.css?inline";
import {
  getSmithsonianCategory,
  setSmithsonianCategory,
  SMITHSONIAN_SETTINGS_KEY,
} from "../sources/smithsonian";
import "./frequency-settings";

import type { SmithsonianCategory } from "../sources/smithsonian";

const CATEGORIES: readonly {
  value: SmithsonianCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "art_design",
    label: "Art & Design",
    description: "Art, portraits, photography, and design",
  },
  {
    value: "history_culture",
    label: "History & Culture",
    description: "Objects and stories from history and culture",
  },
  {
    value: "science_technology",
    label: "Science & Technology",
    description: "Nature, space, science, and technology",
  },
  {
    value: "all",
    label: "All categories",
    description: "Search the complete Open Access collection",
  },
];

@customElement("stellar-smithsonian-settings")
class SmithsonianSettings extends LitElement {
  static override styles = unsafeCSS(styles);

  @state()
  private accessor category: SmithsonianCategory = "art_design";

  @state()
  private accessor loaded = false;

  @state()
  private accessor error = false;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  override render() {
    return html`
      <fieldset>
        <legend>Smithsonian category</legend>
        <p class="hint">Choose which part of the collection to explore.</p>
        <div class="options">
          ${CATEGORIES.map(
            (category) => html`
              <label>
                <input
                  type="radio"
                  name="smithsonian-category"
                  value=${category.value}
                  .checked=${this.category === category.value}
                  ?disabled=${!this.loaded}
                  @change=${this.changeCategory}
                />
                <span class="control" aria-hidden="true"></span>
                <span>
                  <strong>${category.label}</strong>
                  <small>${category.description}</small>
                </span>
              </label>
            `,
          )}
        </div>
      </fieldset>

      <stellar-frequency-settings
        .settingsKey=${SMITHSONIAN_SETTINGS_KEY}
      ></stellar-frequency-settings>

      <p class="status" aria-live="polite">
        ${this.error ? "Couldn’t save this setting." : ""}
      </p>
    `;
  }

  private async load(): Promise<void> {
    try {
      this.category = await getSmithsonianCategory();
    } catch {
      this.error = true;
    } finally {
      this.loaded = true;
    }
  }

  private changeCategory = async (event: Event): Promise<void> => {
    const value = (event.currentTarget as HTMLInputElement).value;
    const category = CATEGORIES.find((item) => item.value === value)?.value;

    if (!category || category === this.category) return;

    const previous = this.category;
    this.category = category;
    this.error = false;
    this.loaded = false;

    try {
      await setSmithsonianCategory(category);
    } catch {
      this.category = previous;
      this.error = true;
    } finally {
      this.loaded = true;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-smithsonian-settings": SmithsonianSettings;
  }
}

export { SmithsonianSettings };
