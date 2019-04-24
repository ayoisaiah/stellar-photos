import { html } from 'lit-html';
import { updateCloudStatus } from '../modules/cloud-options';

/*
 * Settings for cloud synchronization
 */

const updateCloud = event => {
  const selected = event.target[event.target.selectedIndex].value;
  updateCloudStatus(selected);
};

const cloudSettings = () => html`
  <section id="cloud-settings" class="cloud-settings">
    <h3 class="settings-heading">Cloud</h3>
    <div class="saveTo">
      <span class="dialog-label"
        >Connect and sync photos to your preferred cloud service</span
      >

      <select
        @change=${updateCloud}
        class="select-cloud-Storage"
        id="select-cloud-storage"
      >
        <option disabled selected value="noneselected">
          -- Select an option --
        </option>
        <option value="dropbox">Dropbox</option>
        <option value="onedrive">OneDrive</option>
      </select>

      <span class="action" id="action"></span>
    </div>
  </section>
`;

export default cloudSettings;
