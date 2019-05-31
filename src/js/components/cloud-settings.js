import { html } from 'lit-html';
import {
  updateCloudService,
  authorizeCloud,
  updateCloudStatus,
} from '../libs/handle';

/*
 * Settings for cloud synchronization
 */

const cloudSettings = settings => {
  const { cloudService } = settings;
  const token = settings[cloudService];

  chrome.runtime.onMessage.addListener(request => {
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
            >Dropbox</option
          >
          <option
            value="onedrive"
            ?selected=${settings.cloudService === 'onedrive'}
            >OneDrive</option
          >
        </select>

        <span class="action" id="action">
          ${!token
            ? html`
                <button
                  @click=${authorizeCloud}
                  class="authorize"
                  id="authorize"
                >
                  Connect
                </button>
              `
            : html`
                <span class="success-message">Connected</span>
              `}
        </span>
      </div>
    </section>
  `;
};

export default cloudSettings;
