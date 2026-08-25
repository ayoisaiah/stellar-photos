// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";

import styles from "../../css/components/unsplash-settings.css?inline";
import {
  DEFAULT_UNSPLASH_SETTINGS,
  getImageQuality,
  getPhotoFrequency,
  setImageQuality,
  setPhotoFrequency,
} from "../sources/unsplash-settings";

import type { PhotoFrequency } from "../sources/unsplash-settings";
import type { ImageResolution } from "../types";

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

@customElement("stellar-unsplash-settings")
class UnsplashSettings extends LitElement {
  static override styles = unsafeCSS(styles);

  private confirmedFrequency: PhotoFrequency =
    DEFAULT_UNSPLASH_SETTINGS.photoFrequency;
  private confirmedResolution: ImageResolution =
    DEFAULT_UNSPLASH_SETTINGS.imageQuality;
  private saveInFlight = false;
  private saveResetTimeout: number | undefined;

  @state()
  private accessor loaded = false;

  @state()
  private accessor frequency: PhotoFrequency =
    DEFAULT_UNSPLASH_SETTINGS.photoFrequency;

  @state()
  private accessor resolution: ImageResolution =
    DEFAULT_UNSPLASH_SETTINGS.imageQuality;

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
                  .checked=${this.frequency === value}
                  ?disabled=${!this.loaded}
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
                  .checked=${this.resolution === value}
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
      <p class="status" aria-live="polite">${this.statusMessage()}</p>
    `;
  }

  private async load(): Promise<void> {
    try {
      const [frequency, resolution] = await Promise.all([
        getPhotoFrequency(),
        getImageQuality(),
      ]);

      if (!this.saveInFlight) {
        this.confirmedFrequency = frequency;
        this.frequency = frequency;
        this.confirmedResolution = resolution;
        this.resolution = resolution;
      }
    } catch {
      this.saveState = "error";
    } finally {
      this.loaded = true;
    }
  }

  private changeFrequency = async (event: Event): Promise<void> => {
    const target = event.currentTarget as HTMLInputElement;
    const nextFrequency = FREQUENCIES.find(
      ({ value }) => value === target.value,
    )?.value;

    if (!nextFrequency || nextFrequency === this.frequency) return;

    if (this.saveInFlight) return;

    window.clearTimeout(this.saveResetTimeout);
    this.saveInFlight = true;
    this.frequency = nextFrequency;
    this.saveState = "saving";

    try {
      await setPhotoFrequency(nextFrequency);

      this.confirmedFrequency = nextFrequency;
      this.saveState = "saved";
      this.saveResetTimeout = window.setTimeout(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle";
        }
      }, SAVED_RESET_DELAY_MS);
    } catch {
      this.frequency = this.confirmedFrequency;
      this.saveState = "error";
    } finally {
      this.saveInFlight = false;
    }
  };

  private changeResolution = async (event: Event): Promise<void> => {
    const target = event.currentTarget as HTMLInputElement;
    const nextResolution = RESOLUTIONS.find(
      ({ value }) => value === target.value,
    )?.value;

    if (!nextResolution || nextResolution === this.resolution) return;

    if (this.saveInFlight) return;

    window.clearTimeout(this.saveResetTimeout);
    this.saveInFlight = true;
    this.resolution = nextResolution;
    this.saveState = "saving";

    try {
      await setImageQuality(nextResolution);

      this.confirmedResolution = nextResolution;
      this.saveState = "saved";
      this.saveResetTimeout = window.setTimeout(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle";
        }
      }, SAVED_RESET_DELAY_MS);
    } catch {
      this.resolution = this.confirmedResolution;
      this.saveState = "error";
    } finally {
      this.saveInFlight = false;
    }
  };

  private statusMessage(): string {
    if (this.saveState === "saving") return "Saving…";
    if (this.saveState === "saved") return "Saved";
    if (this.saveState === "error") return "Couldn’t save this setting.";

    return "";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-unsplash-settings": UnsplashSettings;
  }
}
