import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import formStyles from "../../css/components/settings-form.css?inline";
import styles from "../../css/components/unsplash-settings.css?inline";
import {
  verifyUnsplashCollection,
  verifyUnsplashTopic,
} from "../sources/unsplash";
import {
  DEFAULT_UNSPLASH_SETTINGS,
  getUnsplashAccessKey,
  getUnsplashSettings,
  setUnsplashAccessKey,
  setUnsplashSettings,
} from "../sources/unsplash-settings";
import {
  readFrequency,
  renderFrequencySelector,
  scheduleSavedReset,
  statusMessage,
} from "./settings-form";
import "./tag-input";

import type {
  ContentFilter,
  ImageResolution,
  PhotoOrientation,
  UnsplashSettings as UnsplashSettingsData,
} from "../sources/unsplash-settings";
import type { SaveState } from "./settings-form";

const RESOLUTIONS: readonly {
  value: ImageResolution;
  label: string;
  description: string;
}[] = [
  {
    value: "standard",
    label: "Standard",
    description: "Up to 2000px · faster and lighter",
  },
  {
    value: "high",
    label: "High",
    description: "Up to 4000px · sharper on large displays",
  },
  {
    value: "max",
    label: "Original",
    description: "Full size · uses the most bandwidth",
  },
];

const ORIENTATIONS: readonly {
  value: PhotoOrientation | "";
  label: string;
}[] = [
  { value: "", label: "Any orientation" },
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
  { value: "squarish", label: "Square" },
];

const CONTENT_FILTERS: readonly {
  value: ContentFilter;
  label: string;
}[] = [
  { value: "low", label: "Standard (low)" },
  { value: "high", label: "Stricter filtering (high)" },
];

@customElement("stellar-unsplash-settings")
class UnsplashSettings extends LitElement {
  static override styles = [unsafeCSS(formStyles), unsafeCSS(styles)];

  private confirmedSettings: UnsplashSettingsData = DEFAULT_UNSPLASH_SETTINGS;
  private confirmedCustomAccessKey = "";
  private saveInFlight = false;
  private saveResetTimeout: number | undefined;

  @state()
  private accessor loaded = false;

  @state()
  private accessor settings: UnsplashSettingsData = DEFAULT_UNSPLASH_SETTINGS;

  @state()
  private accessor customAccessKey = "";

  @state()
  private accessor saveState: SaveState = "idle";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  override disconnectedCallback(): void {
    window.clearTimeout(this.saveResetTimeout);
    super.disconnectedCallback();
  }

  override render() {
    return html`
      ${renderFrequencySelector(
        this.settings.photoFrequency,
        !this.loaded,
        this.changeFrequency,
      )}

      <fieldset>
        <legend>Photo filters</legend>
        <p class="hint">Filter the pool of random photos from Unsplash.</p>
        <div class="filters-grid">
          <div class="field">
            <label for="filter-query">Search keyword</label>
            <input
              id="filter-query"
              type="text"
              class="text-input"
              placeholder="e.g. nature, galaxy"
              .value=${this.settings.query}
              ?disabled=${!this.loaded}
              @input=${(e: Event) => this.updateTextInput("query", e)}
              @change=${(e: Event) => this.saveTextInput("query", e)}
            />
            <p class="field-help">Find photos matching a search term. Note: overrides collections and topics.</p>
          </div>

          <div class="field">
            <label for="filter-collections">Collections</label>
            <stellar-tag-input
              id="filter-collections"
              placeholder="e.g. 998309, 317099"
              .value=${this.settings.collections}
              .validate=${verifyUnsplashCollection}
              ?disabled=${!this.loaded}
              @change=${(e: CustomEvent<{ value: string }>) =>
                this.saveTagInput("collections", e)}
            ></stellar-tag-input>
            <p class="field-help">Public collection IDs. Defaults to <a href="https://unsplash.com/collections/998309/stellar-photos" target="_blank" rel="noopener">Stellar Photos</a>.</p>
          </div>

          <div class="field">
            <label for="filter-topics">Topics</label>
            <stellar-tag-input
              id="filter-topics"
              placeholder="e.g. wallpapers, nature"
              .value=${this.settings.topics}
              .validate=${verifyUnsplashTopic}
              ?disabled=${!this.loaded}
              @change=${(e: CustomEvent<{ value: string }>) =>
                this.saveTagInput("topics", e)}
            ></stellar-tag-input>
            <p class="field-help">Public topic IDs or slugs. Slugs are automatically replaced with IDs.</p>
          </div>

          <div class="field">
            <label for="filter-username">Photographer</label>
            <input
              id="filter-username"
              type="text"
              class="text-input"
              placeholder="e.g. nasa"
              .value=${this.settings.username}
              ?disabled=${!this.loaded}
              @input=${(e: Event) => this.updateTextInput("username", e)}
              @change=${(e: Event) => this.saveTextInput("username", e)}
            />
            <p class="field-help">Limit selection to photos by a single Unsplash username.</p>
          </div>

          <div class="field">
            <label for="filter-orientation">Orientation</label>
            <select
              id="filter-orientation"
              class="select-input"
              .value=${this.settings.orientation}
              ?disabled=${!this.loaded}
              @change=${this.changeOrientation}
            >
              ${ORIENTATIONS.map(
                ({ value, label }) => html`
                  <option value=${value} .selected=${this.settings.orientation === value}>
                    ${label}
                  </option>
                `,
              )}
            </select>
          </div>

          <div class="field">
            <label for="filter-content-safety">Content safety</label>
            <select
              id="filter-content-safety"
              class="select-input"
              .value=${this.settings.contentFilter}
              ?disabled=${!this.loaded}
              @change=${this.changeContentFilter}
            >
              ${CONTENT_FILTERS.map(
                ({ value, label }) => html`
                  <option value=${value} .selected=${this.settings.contentFilter === value}>
                    ${label}
                  </option>
                `,
              )}
            </select>
            <p class="field-help">Filter sensitive content. Set to high for stricter safe-for-work filtering.</p>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Image quality</legend>
        <p class="hint">Applies to the next photograph that is downloaded.</p>
        <div class="options">
          ${RESOLUTIONS.map(
            ({ value, label, description }) => html`
              <label>
                <input
                  type="radio"
                  name="resolution"
                  value=${value}
                  .checked=${this.settings.imageQuality === value}
                  ?disabled=${!this.loaded}
                  @change=${this.changeResolution}
                />
                <span class="control" aria-hidden="true"></span>
                <span>
                  <strong>${label}</strong>
                  <small>${description}</small>
                </span>
              </label>
            `,
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>Custom access key</legend>
        <p class="hint">Use your own Unsplash API application access key instead of the built-in key to guarantee higher usage limits.</p>
        <div class="field">
          <label for="unsplash-access-key">Access key</label>
          <input
            id="unsplash-access-key"
            type="password"
            class="text-input"
            autocomplete="off"
            spellcheck="false"
            placeholder="Paste your Unsplash Access Key"
            .value=${this.customAccessKey}
            ?disabled=${!this.loaded}
            @input=${this.updateAccessKey}
            @change=${this.saveAccessKey}
          />
          <p class="field-help">Leave blank to use the built-in key.</p>
        </div>
      </fieldset>
      <p class="status" aria-live="polite">${statusMessage(this.saveState)}</p>
    `;
  }

  private async load(): Promise<void> {
    try {
      const [settings, customAccessKey] = await Promise.all([
        getUnsplashSettings(),
        getUnsplashAccessKey(),
      ]);

      if (!this.saveInFlight) {
        this.confirmedSettings = settings;
        this.settings = settings;
        this.confirmedCustomAccessKey = customAccessKey;
        this.customAccessKey = customAccessKey;
      }
    } catch {
      this.saveState = "error";
    } finally {
      this.loaded = true;
    }
  }

  private persist = async (
    partial: Partial<Omit<UnsplashSettingsData, "version">>,
  ): Promise<void> => {
    this.settings = { ...this.settings, ...partial };

    if (this.saveInFlight) return;

    window.clearTimeout(this.saveResetTimeout);
    this.saveInFlight = true;
    this.saveState = "saving";

    while (
      JSON.stringify(this.settings) !== JSON.stringify(this.confirmedSettings)
    ) {
      const target = { ...this.settings };
      try {
        await setUnsplashSettings(target);
        this.confirmedSettings = target;
      } catch {
        this.settings = { ...this.confirmedSettings };
        this.saveState = "error";
        this.saveInFlight = false;
        return;
      }
    }

    this.saveState = "saved";
    this.saveResetTimeout = scheduleSavedReset(() => {
      if (this.saveState === "saved") {
        this.saveState = "idle";
      }
    });
    this.saveInFlight = false;
  };

  private changeFrequency = (event: Event): void => {
    const nextFrequency = readFrequency(event);

    if (!nextFrequency || nextFrequency === this.settings.photoFrequency)
      return;

    void this.persist({ photoFrequency: nextFrequency });
  };

  private changeResolution = (event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    const nextResolution = RESOLUTIONS.find(
      ({ value }) => value === target.value,
    )?.value;

    if (!nextResolution || nextResolution === this.settings.imageQuality)
      return;

    void this.persist({ imageQuality: nextResolution });
  };

  private changeOrientation = (event: Event): void => {
    const target = event.currentTarget as HTMLSelectElement;
    const nextOrientation = ORIENTATIONS.find(
      ({ value }) => value === target.value,
    )?.value;

    if (
      nextOrientation === undefined ||
      nextOrientation === this.settings.orientation
    )
      return;

    void this.persist({ orientation: nextOrientation });
  };

  private changeContentFilter = (event: Event): void => {
    const target = event.currentTarget as HTMLSelectElement;
    const nextFilter = CONTENT_FILTERS.find(
      ({ value }) => value === target.value,
    )?.value;

    if (!nextFilter || nextFilter === this.settings.contentFilter) return;

    void this.persist({ contentFilter: nextFilter });
  };

  private saveTagInput = (
    field: "collections" | "topics",
    event: CustomEvent<{ value: string }>,
  ): void => {
    const nextValue = event.detail.value;

    if (nextValue === this.confirmedSettings[field]) return;

    void this.persist({ [field]: nextValue });
  };

  private updateTextInput = (
    field: "username" | "query",
    event: Event,
  ): void => {
    const target = event.currentTarget as HTMLInputElement;
    this.settings = { ...this.settings, [field]: target.value };
  };

  private saveTextInput = (field: "username" | "query", event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    const trimmed = target.value.trim();

    if (trimmed === this.confirmedSettings[field]) return;

    void this.persist({ [field]: trimmed });
  };

  private updateAccessKey = (event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    this.customAccessKey = target.value;
  };

  private saveAccessKey = async (event: Event): Promise<void> => {
    const target = event.currentTarget as HTMLInputElement;
    const trimmed = target.value.trim();

    if (trimmed === this.confirmedCustomAccessKey) return;

    window.clearTimeout(this.saveResetTimeout);
    this.saveState = "saving";

    try {
      await setUnsplashAccessKey(trimmed);
      this.confirmedCustomAccessKey = trimmed;
      this.customAccessKey = trimmed;
      this.saveState = "saved";
      this.saveResetTimeout = scheduleSavedReset(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle";
        }
      });
    } catch {
      this.customAccessKey = this.confirmedCustomAccessKey;
      this.saveState = "error";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-unsplash-settings": UnsplashSettings;
  }
}
