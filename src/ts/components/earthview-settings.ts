// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import styles from "../../css/components/earthview-settings.css?inline";
import {
  DEFAULT_EARTHVIEW_SETTINGS,
  getEarthViewSettings,
  setEarthViewSettings,
} from "../sources/earthview-settings";

import type { EarthViewSettings as EarthViewSettingsData } from "../sources/earthview-settings";
import type { PhotoFrequency } from "../sources/unsplash-settings";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_RESET_DELAY_MS = 2500;

const FREQUENCIES: readonly {
  value: PhotoFrequency;
  label: string;
  description: string;
}[] = [
  {
    value: "newtab",
    label: "Every new tab",
    description: "Load a new photo whenever you open a tab",
  },
  {
    value: "every15minutes",
    label: "Every 15 minutes",
    description: "Keep the same photo for 15 minutes",
  },
  {
    value: "everyhour",
    label: "Every hour",
    description: "Keep the same photo for 1 hour",
  },
  {
    value: "everyday",
    label: "Every 24 hours",
    description: "Keep the same photo for 24 hours",
  },
];

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
      <fieldset>
        <legend>Change background image</legend>
        <p class="hint">Choose how often Stellar Photos displays a new photo.</p>
        <div class="options">
          ${FREQUENCIES.map(
            ({ value, label, description }) => html`
              <label>
                <input
                  type="radio"
                  name="frequency"
                  value=${value}
                  .checked=${this.settings.photoFrequency === value}
                  @change=${this.changeFrequency}
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

      <p class="status" aria-live="polite">${this.statusMessage()}</p>
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
    const target = event.target as HTMLInputElement;

    this.settings = {
      ...this.settings,
      photoFrequency: target.value as PhotoFrequency,
    };

    void this.save();
  };

  private async save(): Promise<void> {
    if (this.saveInFlight) return;

    this.saveInFlight = true;
    this.saveState = "saving";
    window.clearTimeout(this.saveResetTimeout);

    try {
      await setEarthViewSettings(this.settings);
      this.confirmedSettings = this.settings;
      this.saveState = "saved";
      this.saveResetTimeout = window.setTimeout(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle";
        }
      }, SAVED_RESET_DELAY_MS);
    } catch {
      this.saveState = "error";
      this.settings = this.confirmedSettings;
    } finally {
      this.saveInFlight = false;
    }
  }

  private statusMessage(): string {
    switch (this.saveState) {
      case "saving":
        return "Saving changes…";
      case "saved":
        return "Saved";
      case "error":
        return "Failed to save settings";
      case "idle":
      default:
        return "";
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-earthview-settings": EarthViewSettingsComponent;
  }
}

export { EarthViewSettingsComponent };
