import * as Ladda from 'ladda';
import { html, render, TemplateResult } from 'lit-html';
import { authorizeOneDrive } from '../../js/libs/onedrive';
import { authorizeDropbox } from '../../js/libs/dropbox';
import { $ } from '../../js/libs/helpers';
import { ChromeStorage } from '../types';
import notifySnackbar from '../../js/libs/notify-snackbar';

async function authorizeCloud(): Promise<void> {
  const selectCloud = $('select-cloud-storage') as HTMLSelectElement;
  const selectedOption = selectCloud[
    selectCloud.selectedIndex
  ] as HTMLOptionElement;
  const selected = selectedOption.value;
  const spinner = Ladda.create(
    document.getElementById('js-connect-cloud') as HTMLButtonElement
  );
  spinner.start();

  try {
    if (selected === 'dropbox') {
      await authorizeDropbox();
    }

    if (selected === 'onedrive') {
      authorizeOneDrive();
    }
  } catch (err) {
    notifySnackbar(err, 'error');
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
    <button @click=${authorizeCloud} class="authorize" id="authorize">
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
    const { value } = selected;
    await chrome.storage.local.set({ cloudService: value });
    const result = await chrome.storage.local.get(value);

    const flag = Boolean(result[value]);
    updateCloudStatus(flag);
  } catch (err) {
    notifySnackbar(
      'An error occurred while updating the cloud service',
      'error'
    );
  }
}

function cloudSettings(settings: ChromeStorage): TemplateResult {
  const cloudService = settings.cloudService as ChromeStorage['cloudService'];
  let token: ChromeStorage['dropbox'] | ChromeStorage['onedrive'];
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
      <h3 class="settings-heading">Cloud</h3>
      <div class="saveTo">
        <span class="dialog-label"
          >Connect and sync photos to your preferred cloud service</span
        >

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
        </select>

        <span class="action" id="js-action">
          ${!token
            ? html`
                <button
                  @click=${authorizeCloud}
                  class="authorize ladda-button"
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
