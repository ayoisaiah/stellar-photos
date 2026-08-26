import { Folder, FolderOpen } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, query, state } from "lit/decorators.js";

import styles from "../../css/components/local-settings.css?inline";
import { getLocalMeta, saveDirectoryHandle } from "../sources/local-db";
import {
  DEFAULT_LOCAL_SETTINGS,
  getLocalPhotoFrequency,
  setLocalPhotoFrequency,
  setLocalSettings,
} from "../sources/local-settings";
import "./lucide-icon";

import type { PhotoFrequency } from "../sources/unsplash-settings";

type SaveState = "idle" | "saving" | "saved" | "error";

interface DirectoryPickerWindow {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
}

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

@customElement("stellar-local-settings")
class LocalSettingsComponent extends LitElement {
  static override styles = unsafeCSS(styles);

  private confirmedFrequency: PhotoFrequency =
    DEFAULT_LOCAL_SETTINGS.photoFrequency;
  private saveInFlight = false;
  private saveResetTimeout: number | undefined;

  @state()
  private accessor loaded = false;

  @state()
  private accessor loading = false;

  @state()
  private accessor folderName = "";

  @state()
  private accessor photoCount = 0;

  @state()
  private accessor frequency: PhotoFrequency =
    DEFAULT_LOCAL_SETTINGS.photoFrequency;

  @state()
  private accessor errorMessage = "";

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
    const hasFolder = Boolean(this.folderName && this.photoCount > 0);

    return html`
      <fieldset>
        <legend>Folder</legend>
        <p class="hint">
          Select a folder on your computer containing photos to display.
        </p>
        <div class="folder-card">
          <div class="folder-info">
            <div class="folder-icon-wrap">
              <stellar-icon
                .icon=${hasFolder ? FolderOpen : Folder}
              ></stellar-icon>
            </div>
            <div class="folder-details">
              <p class="folder-name">
                ${hasFolder ? this.folderName : "No folder selected"}
              </p>
              <p class="folder-count">
                ${
                  hasFolder
                    ? `${this.photoCount} photo${this.photoCount === 1 ? "" : "s"} found`
                    : "Choose a folder with image files"
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn-select"
            ?disabled=${!this.loaded || this.loading}
            @click=${this.selectFolder}
          >
            <stellar-icon .icon=${FolderOpen}></stellar-icon>
            ${hasFolder ? "Change folder" : "Select folder"}
          </button>
        </div>
        ${
          this.errorMessage
            ? html`<p class="error-message" role="alert">${this.errorMessage}</p>`
            : null
        }
      </fieldset>

      <fieldset>
        <legend>Change background image</legend>
        <p class="hint">Choose how often Stellar Photos displays a new photo.</p>
        <div class="options">
          ${FREQUENCIES.map(
            ({ value, label, description }) => html`
              <label class="radio-label">
                <input
                  type="radio"
                  name="frequency"
                  value=${value}
                  .checked=${this.frequency === value}
                  ?disabled=${!this.loaded || this.loading}
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
      const [meta, frequency] = await Promise.all([
        getLocalMeta(),
        getLocalPhotoFrequency(),
      ]);

      if (meta) {
        this.folderName = meta.folderName;
        this.photoCount = meta.photoCount;
      }

      this.confirmedFrequency = frequency;
      this.frequency = frequency;
    } catch {
      this.saveState = "error";
    } finally {
      this.loaded = true;
    }
  }

  private selectFolder = async (): Promise<void> => {
    const win = window as unknown as DirectoryPickerWindow;

    if (typeof win.showDirectoryPicker !== "function") {
      this.errorMessage =
        "The File System Access API is not supported in this browser.";
      return;
    }

    try {
      const dirHandle = await win.showDirectoryPicker({
        id: "stellar-photos-folder",
        mode: "read",
      });

      this.loading = true;
      this.errorMessage = "";
      this.saveState = "saving";

      const count = await saveDirectoryHandle(dirHandle);
      await setLocalSettings({ folderName: dirHandle.name });

      this.folderName = dirHandle.name;
      this.photoCount = count;
      this.saveState = "saved";

      this.dispatchEvent(
        new CustomEvent("select-source", {
          detail: { sourceId: "local" },
          bubbles: true,
          composed: true,
        }),
      );

      window.clearTimeout(this.saveResetTimeout);
      this.saveResetTimeout = window.setTimeout(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle";
        }
      }, SAVED_RESET_DELAY_MS);
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;

      this.errorMessage =
        (err as Error).message || "Failed to access the selected folder";
      this.saveState = "error";
    } finally {
      this.loading = false;
    }
  };

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
      await setLocalPhotoFrequency(nextFrequency);

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

  private statusMessage(): string {
    if (this.loading) return "Reading folder photos…";
    if (this.saveState === "saving") return "Saving…";
    if (this.saveState === "saved") return "Saved";
    if (this.saveState === "error") return "Couldn’t save this setting.";

    return "";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-local-settings": LocalSettingsComponent;
  }
}

export { LocalSettingsComponent };
