// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import styles from "../../css/components/earthview-settings.css?inline";
import {
  DEFAULT_EARTHVIEW_SETTINGS,
  getEarthViewSettings,
  setEarthViewSettings,
} from "../sources/earthview-settings";
import {
  readFrequency,
  renderFrequencySelector,
  scheduleSavedReset,
  statusMessage,
} from "./settings-form";

import type { EarthViewSettings as EarthViewSettingsData } from "../sources/earthview-settings";
import type { SaveState } from "./settings-form";

@customElement("stellar-earthview-settings")
class EarthViewSettingsComponent extends LitElement {
  static override styles = unsafeCSS(styles);

  private confirmedSettings: EarthViewSettingsData = DEFAULT_EARTHVIEW_SETTINGS;
  private saveInFlight = false;
  private saveResetTimeout: number | undefined;

  @state()
  private accessor settings: EarthViewSettingsData = DEFAULT_EARTHVIEW_SETTINGS;

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
        false,
        this.changeFrequency,
      )}

      <p class="status" aria-live="polite">${statusMessage(this.saveState)}</p>
    `;
  }

  private async load(): Promise<void> {
    try {
      const settings = await getEarthViewSettings();

      this.confirmedSettings = settings;
      this.settings = settings;
    } catch {
      this.saveState = "error";
    }
  }

  private changeFrequency = (event: Event): void => {
    const frequency = readFrequency(event);

    if (!frequency || frequency === this.settings.photoFrequency) return;

    this.settings = {
      ...this.settings,
      photoFrequency: frequency,
    };

    void this.save();
  };

  private async save(): Promise<void> {
    if (this.saveInFlight) return;

    this.saveInFlight = true;
    this.saveState = "saving";
    window.clearTimeout(this.saveResetTimeout);

    while (
      this.settings.photoFrequency !== this.confirmedSettings.photoFrequency
    ) {
      const targetSettings = { ...this.settings };
      try {
        await setEarthViewSettings(targetSettings);
        this.confirmedSettings = targetSettings;
      } catch {
        this.saveState = "error";
        this.settings = this.confirmedSettings;
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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-earthview-settings": EarthViewSettingsComponent;
  }
}

export { EarthViewSettingsComponent };
