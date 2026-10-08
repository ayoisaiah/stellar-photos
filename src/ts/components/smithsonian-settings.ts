import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import styles from "../../css/components/settings-form.css?inline";
import type { SmithsonianCategory } from "../sources/smithsonian";
import {
  getSmithsonianCategory,
  setSmithsonianCategory,
} from "../sources/smithsonian";
import { renderRadioGroup } from "./settings-form";

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
        ${renderRadioGroup(
          "smithsonian-category",
          CATEGORIES,
          this.category,
          (cat) => void this.selectCategory(cat),
          !this.loaded,
        )}
      </fieldset>

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

  private selectCategory = async (
    category: SmithsonianCategory,
  ): Promise<void> => {
    if (category === this.category) return;

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
