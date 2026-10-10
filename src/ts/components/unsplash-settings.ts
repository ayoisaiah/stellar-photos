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
import { renderRadioGroup, SaveStatusController } from "./settings-form";
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
    const changed = Object.fromEntries(
      Object.entries(partial).filter(
        ([key, value]) =>
          value !== this.settings[key as keyof UnsplashSettingsData],
      ),
    ) as Partial<Omit<UnsplashSettingsData, "version">>;

    if (Object.keys(changed).length === 0) return;

    const previousSettings = this.settings;
    this.settings = { ...this.settings, ...changed };
    this.saveStatus.set("saving");

    try {
      await setUnsplashSettings(changed);
      this.saveStatus.set("saved");
    } catch {
      this.settings = await getUnsplashSettings().catch(() => previousSettings);
      this.saveStatus.set("error");
    }
  };

  private changeResolution = (value: ImageResolution): void => {
    void this.persist({ imageQuality: value });
  };

  private changeOrientation = (event: Event): void => {
    const target = event.currentTarget as HTMLSelectElement;
    void this.persist({ orientation: target.value as PhotoOrientation | "" });
  };

  private changeContentFilter = (event: Event): void => {
    const target = event.currentTarget as HTMLSelectElement;
    void this.persist({ contentFilter: target.value as ContentFilter });
  };

  private saveTagInput = (
    field: "collections" | "topics",
    event: CustomEvent<{ value: string }>,
  ): void => {
    void this.persist({ [field]: event.detail.value });
  };

  private saveTextInput = (field: "username" | "query", event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    const value = target.value.trim();
    target.value = value;

    void this.persist({ [field]: value });
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
