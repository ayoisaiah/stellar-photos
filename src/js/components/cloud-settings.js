import { html } from 'lit-html';
import { $ } from '../libs/helpers';
import { authorizeDropbox } from '../libs/dropbox';
import { authorizeOneDrive } from '../libs/onedrive';
import { updateCloudService } from '../libs/handle';

/*
 * Settings for cloud synchronization
 */

const authorizeCloud = () => {
  const selectCloud = $('select-cloud-storage');
  const selected = selectCloud[selectCloud.selectedIndex].value;

  if (selected === 'dropbox') {
    authorizeDropbox();
  }

  if (selected === 'onedrive') {
    authorizeOneDrive();
  }
};

const cloudSettings = settings => {
  const { cloudService } = settings;
  const token = settings[cloudService];

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
