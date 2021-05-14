import * as Ladda from 'ladda';
import { html, render, TemplateResult } from 'lit-html';
import { openOnedriveAuthPage } from '../onedrive';
import { openDropboxAuthPage } from '../dropbox';
import { openGoogleDriveAuthPage } from '../googledrive';
import { $, getFromChromeLocalStorage } from '../helpers';
import { ChromeLocalStorage, ChromeStorage } from '../types';
import { snackbar } from '../ui/snackbar';

async function authorizeCloud(): Promise<void> {
  const selectCloud = $('select-cloud-storage') as HTMLSelectElement;
  const selectedOption = selectCloud[
    selectCloud.selectedIndex
  ] as HTMLOptionElement;
  const selected = selectedOption.value;
  const spinner = Ladda.create($('js-connect-cloud') as HTMLButtonElement);
  spinner.start();

  try {
    if (selected === 'dropbox') {
      await openDropboxAuthPage();
    }

    if (selected === 'onedrive') {
      await openOnedriveAuthPage();
    }

    if (selected === 'googledrive') {
      await openGoogleDriveAuthPage();
    }
  } catch (err) {
    snackbar(err, 'error');
  } finally {
    spinner.stop();
  }
}

function updateCloudStatus(flag: boolean): void {
  const action = $('js-action') as HTMLSpanElement;

  if (flag) {
    const successMessage = html`
      <span class="success-message">Connected</span>
    `;

    return render(successMessage, action);
  }

  const authorizeButton = html`
    <button
      id="js-connect-cloud"
      data-style="expand-right"
      @click=${authorizeCloud}
      class="authorize"
      id="authorize"
    >
      Connect
    </button>
  `;

  return render(authorizeButton, action);
}

async function updateCloudService(event: { target: HTMLSelectElement }) {
  try {
    const selected = event.target[
      event.target.selectedIndex
    ] as HTMLOptionElement;
    const value = selected.value as ChromeLocalStorage['cloudService'];

    if (!value) return;

    chrome.storage.local.set({ cloudService: value });
    const result = await getFromChromeLocalStorage(value);

    const flag = Boolean(result[value]);
    updateCloudStatus(flag);
  } catch (err) {
    snackbar('An error occurred while updating the cloud service', 'error');
  }
}

function cloudSettings(settings: ChromeStorage): TemplateResult {
  const cloudService = settings.cloudService as ChromeStorage['cloudService'];
  let token:
    | ChromeStorage['dropbox']
    | ChromeStorage['onedrive']
    | ChromeStorage['googledrive'];
  if (cloudService) {
    token = settings[cloudService];
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.command === 'update-cloud-status') {
      updateCloudStatus(true);
    }
  });

  return html`
    <section id="cloud-settings" class="cloud-settings">
      <h3 class="subtitle is-4">Cloud settings</h3>
      <div class="field saveTo">
        <label class="label dialog-label">Sync photos to the Cloud</label>

        <div class="control">
          <div class="select is-fullwidth">
            <select
              @input=${updateCloudService}
              class="select-cloud-Storage"
              id="select-cloud-storage"
            >
              <option
                disabled
                ?selected=${settings.cloudService === null}
                value="noneselected"
              >
                -- Select an option --
              </option>
              <option
                value="dropbox"
                ?selected=${settings.cloudService === 'dropbox'}
              >
                Dropbox
              </option>
              <option
                value="onedrive"
                ?selected=${settings.cloudService === 'onedrive'}
              >
                OneDrive
              </option>
              <option
                value="googledrive"
                ?selected=${settings.cloudService === 'googledrive'}
              >
                Google Drive
              </option>
            </select>
          </div>
        </div>

        <span class="action" id="js-action">
          ${!token
            ? html`
                <button
                  @click=${authorizeCloud}
                  class="button is-link authorize ladda-button"
                  id="js-connect-cloud"
                  data-style="expand-right"
                >
                  <span class="ladda-label">Connect</span>
                </button>
              `
            : html` <span class="success-message">Connected</span> `}
        </span>
      </div>
    </section>
  `;
}

export default cloudSettings;
