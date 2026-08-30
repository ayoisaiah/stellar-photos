// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import styles from "../../css/components/settings-form.css?inline";
import {
  getStoredPhotoFrequency,
  setStoredPhotoFrequency,
} from "../sources/photo-frequency";
import {
  readFrequency,
  renderFrequencySelector,
  scheduleSavedReset,
  statusMessage,
} from "./settings-form";

import type { PhotoFrequency } from "../sources/photo-frequency";
import type { SaveState } from "./settings-form";

@customElement("stellar-frequency-settings")
class FrequencySettings extends LitElement {
  static override styles = unsafeCSS(styles);

  @property()
  accessor settingsKey = "";

  private confirmedFrequency: PhotoFrequency = "newtab";
  private saveInFlight = false;
  private saveResetTimeout: number | undefined;

  @state()
  private accessor frequency: PhotoFrequency = "newtab";

  @state()
  private accessor loaded = false;

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
        this.frequency,
        !this.loaded,
        this.changeFrequency,
      )}

      <p class="status" aria-live="polite">${statusMessage(this.saveState)}</p>
    `;
  }

  private async load(): Promise<void> {
    try {
      const frequency = await getStoredPhotoFrequency(this.settingsKey);

      this.confirmedFrequency = frequency;
      this.frequency = frequency;
    } catch {
      this.saveState = "error";
    } finally {
      this.loaded = true;
    }
  }

  private changeFrequency = (event: Event): void => {
    const frequency = readFrequency(event);

    if (!frequency || frequency === this.frequency) return;

    this.frequency = frequency;
    void this.save();
  };

  private async save(): Promise<void> {
    if (this.saveInFlight) return;

    this.saveInFlight = true;
    this.saveState = "saving";
    window.clearTimeout(this.saveResetTimeout);

    while (this.frequency !== this.confirmedFrequency) {
      const target = this.frequency;
      try {
        await setStoredPhotoFrequency(this.settingsKey, target);
        this.confirmedFrequency = target;
      } catch {
        this.frequency = this.confirmedFrequency;
        this.saveState = "error";
        this.saveInFlight = false;
        return;
      }
    }

    this.saveState = "saved";
    this.saveResetTimeout = scheduleSavedReset(() => {
      if (this.saveState === "saved") this.saveState = "idle";
    });
    this.saveInFlight = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-frequency-settings": FrequencySettings;
  }
}

export { FrequencySettings };
