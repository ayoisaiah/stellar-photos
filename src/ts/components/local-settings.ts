import { Folder, FolderOpen, Plus, RefreshCw, Trash2 } from "@lucide/icons";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import styles from "../../css/components/local-settings.css?inline";
import formStyles from "../../css/components/settings-form.css?inline";
import {
  addDirectoryHandle,
  listStoredFolderRecords,
  removeDirectoryHandle,
  rescanAllFolders,
} from "../sources/local-db";
import { setLocalSettings } from "../sources/local-settings";
import { scheduleSavedReset, statusMessage } from "./settings-form";
import "./lucide-icon";

import type { LocalFolderRecord } from "../sources/local-db";
import type { SaveState } from "./settings-form";

interface DirectoryPickerWindow {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
}

@customElement("stellar-local-settings")
class LocalSettingsComponent extends LitElement {
  static override styles = [unsafeCSS(formStyles), unsafeCSS(styles)];

  private saveResetTimeout: number | undefined;

  @state()
  private accessor loading = true;

  @state()
  private accessor scanning = false;

  @state()
  private accessor folders: LocalFolderRecord[] = [];

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
    const totalPhotos = this.folders.reduce(
      (sum, f) => sum + (f.photoCount || 0),
      0,
    );

    return html`
      <fieldset>
        <legend>Folders</legend>
        <p class="hint">
          Select one or more folders containing photos. Subdirectories are included automatically.
        </p>

        ${
          this.folders.length > 0
            ? html`
              <div class="folders-list">
                ${this.folders.map(
                  (folder) => html`
                    <div class="folder-card">
                      <div class="folder-info">
                        <div class="folder-icon-wrap">
                          <stellar-icon .icon=${FolderOpen}></stellar-icon>
                        </div>
                        <div class="folder-details">
                          <p class="folder-name">${folder.folderName}</p>
                          <p class="folder-count">
                            ${folder.photoCount} photo${folder.photoCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="btn-icon btn-remove"
                        aria-label="Remove ${folder.folderName}"
                        title="Remove folder"
                        ?disabled=${this.loading || this.scanning}
                        @click=${() => this.removeFolder(folder.id)}
                      >
                        <stellar-icon .icon=${Trash2}></stellar-icon>
                      </button>
                    </div>
                  `,
                )}
              </div>
            `
            : html`
              <div class="folder-card empty-state">
                <div class="folder-info">
                  <div class="folder-icon-wrap">
                    <stellar-icon .icon=${Folder}></stellar-icon>
                  </div>
                  <div class="folder-details">
                    <p class="folder-name">No folders selected</p>
                    <p class="folder-count">
                      Add a folder with image files to get started
                    </p>
                  </div>
                </div>
              </div>
            `
        }

        <div class="folder-actions">
          <button
            type="button"
            class="btn-select"
            ?disabled=${this.loading || this.scanning}
            @click=${this.addFolder}
          >
            <stellar-icon .icon=${Plus}></stellar-icon>
            ${this.folders.length > 0 ? "Add another folder" : "Select folder"}
          </button>
          ${
            this.folders.length > 0
              ? html`
                <button
                  type="button"
                  class="btn-select btn-rescan"
                  ?disabled=${this.loading || this.scanning}
                  @click=${this.rescanFolders}
                >
                  <stellar-icon
                    .icon=${RefreshCw}
                    class=${this.scanning ? "spinning" : ""}
                  ></stellar-icon>
                  ${this.scanning ? "Rescanning..." : "Rescan folders"}
                </button>
                <span class="total-summary">
                  Total: ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"} across ${this.folders.length} folder${this.folders.length === 1 ? "" : "s"}
                </span>
              `
              : null
          }
        </div>

        ${
          this.errorMessage
            ? html`<p class="error-message" role="alert">${this.errorMessage}</p>`
            : null
        }
      </fieldset>

      <p class="status" aria-live="polite">
        ${this.loading ? "Reading folder photos…" : statusMessage(this.saveState)}
      </p>
    `;
  }

  private async load(): Promise<void> {
    try {
      this.folders = await listStoredFolderRecords();
    } catch {
      this.saveState = "error";
    } finally {
      this.loading = false;
    }
  }

  private rescanFolders = async (): Promise<void> => {
    if (this.scanning || this.folders.length === 0) return;

    this.scanning = true;
    this.errorMessage = "";

    try {
      const updated = await rescanAllFolders();
      this.folders = updated;
      this.saveState = "saved";

      window.clearTimeout(this.saveResetTimeout);
      this.saveResetTimeout = scheduleSavedReset(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle";
        }
      });
    } catch (err: unknown) {
      this.errorMessage = (err as Error).message || "Failed to rescan folders";
    } finally {
      this.scanning = false;
    }
  };

  private addFolder = async (): Promise<void> => {
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

      await addDirectoryHandle(dirHandle);
      const updatedFolders = await listStoredFolderRecords();
      const folderNames = updatedFolders.map((f) => f.folderName).join(", ");
      await setLocalSettings({ folderName: folderNames });

      this.folders = updatedFolders;
      this.saveState = "saved";

      window.clearTimeout(this.saveResetTimeout);
      this.saveResetTimeout = scheduleSavedReset(() => {
        if (this.saveState === "saved") {
          this.saveState = "idle";
        }
      });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;

      this.errorMessage =
        (err as Error).message || "Failed to access the selected folder";
      this.saveState = "error";
    } finally {
      this.loading = false;
    }
  };

  private removeFolder = async (id: string): Promise<void> => {
    this.loading = true;
    this.errorMessage = "";

    try {
      await removeDirectoryHandle(id);
      const updatedFolders = await listStoredFolderRecords();
      const folderNames = updatedFolders.map((f) => f.folderName).join(", ");
      await setLocalSettings({ folderName: folderNames });

      this.folders = updatedFolders;
    } catch (err: unknown) {
      this.errorMessage =
        (err as Error).message || "Failed to remove the folder";
    } finally {
      this.loading = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-local-settings": LocalSettingsComponent;
  }
}

export { LocalSettingsComponent };
