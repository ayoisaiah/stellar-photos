import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import formStyles from "../../css/components/settings-form.css?inline";
import styles from "../../css/components/unsplash-settings.css?inline";
import {
  verifyUnsplashAccessKey,
  verifyUnsplashCollection,
  verifyUnsplashTopic,
} from "../sources/unsplash";
import {
  CONTENT_FILTERS,
  DEFAULT_UNSPLASH_SETTINGS,
  getUnsplashAccessKey,
  getUnsplashSettings,
  ORIENTATIONS,
  RESOLUTIONS,
  setUnsplashAccessKey,
  setUnsplashSettings,
} from "../sources/unsplash-settings";
import {
  renderRadioGroup,
  type SaveState,
  SaveStatusController,
} from "./settings-form";
import "./tag-input";

import type {
  ContentFilter,
  ImageResolution,
  PhotoOrientation,
  UnsplashSettings as UnsplashSettingsData,
} from "../sources/unsplash-settings";

@customElement("stellar-unsplash-settings")
class UnsplashSettings extends LitElement {
  static override styles = [unsafeCSS(formStyles), unsafeCSS(styles)];

  private saveStatus = new SaveStatusController(this);
  private confirmedCustomAccessKey = "";

  get saveState(): SaveState {
    return this.saveStatus.state;
  }

  set saveState(state: SaveState) {
    this.saveStatus.set(state);
  }

  @state()
  private accessor validatingAccessKey = false;

  @state()
  private accessor loaded = false;

  @state()
  private accessor settings: UnsplashSettingsData = DEFAULT_UNSPLASH_SETTINGS;

  @state()
  private accessor customAccessKey = "";

  @state()
  private accessor accessKeyError = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  override render() {
    return html`
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
        ${renderRadioGroup(
          "resolution",
          RESOLUTIONS,
          this.settings.imageQuality,
          (val) => this.changeResolution(val),
          !this.loaded,
        )}
      </fieldset>

      <fieldset>
        <legend>Custom access key</legend>
        <p class="hint">Use your own Unsplash API application access key instead of sharing the built-in key’s usage limit.</p>
        <form class="field" @submit=${this.saveAccessKey}>
          <label for="unsplash-access-key">Access key</label>
          <input
            id="unsplash-access-key"
            type="password"
            class="text-input ${this.accessKeyError ? "error" : ""}"
            autocomplete="off"
            spellcheck="false"
            placeholder="Paste your Unsplash Access Key"
            .value=${this.customAccessKey}
            aria-invalid=${this.accessKeyError ? "true" : "false"}
            aria-describedby="access-key-help access-key-error"
            ?disabled=${!this.loaded || this.validatingAccessKey}
            @input=${this.updateAccessKey}
          />
          <p id="access-key-help" class="field-help">Leave blank and save to use the built-in key.</p>
          <button type="submit" ?disabled=${!this.loaded || this.validatingAccessKey}>
            ${this.validatingAccessKey ? "Validating…" : "Save and test"}
          </button>
          ${
            this.accessKeyError
              ? html`<p id="access-key-error" class="field-error" role="alert">${this.accessKeyError}</p>`
              : null
          }
        </form>
      </fieldset>
      <p class="status" aria-live="polite">${this.saveStatus.message}</p>
    `;
  }

  private async load(): Promise<void> {
    try {
      const [settings, customAccessKey] = await Promise.all([
        getUnsplashSettings(),
        getUnsplashAccessKey(),
      ]);

      this.settings = settings;
      this.confirmedCustomAccessKey = customAccessKey;
      this.customAccessKey = customAccessKey;
    } catch {
      this.saveStatus.set("error");
    } finally {
      this.loaded = true;
    }
  }

  private persist = async (
    partial: Partial<Omit<UnsplashSettingsData, "version">>,
  ): Promise<void> => {
    this.settings = { ...this.settings, ...partial };
    this.saveStatus.set("saving");

    try {
      await setUnsplashSettings(partial);
      this.saveStatus.set("saved");
    } catch {
      this.settings = await getUnsplashSettings();
      this.saveStatus.set("error");
    }
  };

  private changeResolution = (value: ImageResolution): void => {
    if (value === this.settings.imageQuality) return;

    void this.persist({ imageQuality: value });
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

    if (nextValue === this.settings[field]) return;

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

    if (trimmed === this.settings[field]) return;

    void this.persist({ [field]: trimmed });
  };

  private updateAccessKey = (event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    this.customAccessKey = target.value;

    if (this.accessKeyError) {
      this.accessKeyError = "";
    }

    if (this.saveStatus.state === "error") {
      this.saveStatus.set("idle");
    }
  };

  private saveAccessKey = async (event: Event): Promise<void> => {
    event.preventDefault();

    const trimmed = this.customAccessKey.trim();

    if (trimmed === this.confirmedCustomAccessKey || this.validatingAccessKey) {
      return;
    }

    this.accessKeyError = "";
    this.validatingAccessKey = true;
    this.saveStatus.set("saving");

    try {
      const result = trimmed
        ? await verifyUnsplashAccessKey(trimmed)
        : { valid: true };

      if (!result.valid) {
        this.accessKeyError = result.error ?? "Invalid Unsplash access key.";
        this.saveStatus.set("idle");
        return;
      }

      await setUnsplashAccessKey(trimmed);
      this.confirmedCustomAccessKey = trimmed;
      this.customAccessKey = trimmed;
      this.saveStatus.set("saved");
    } catch {
      this.saveStatus.set("error");
    } finally {
      this.validatingAccessKey = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-unsplash-settings": UnsplashSettings;
  }
}

export { UnsplashSettings };
