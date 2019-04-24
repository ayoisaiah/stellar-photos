import { html } from 'lit-html';
import generalSettings from './general-settings';
import weatherSettings from './weather-settings';
import cloudSettings from './cloud-settings';
import { closeSettingsDialog } from '../libs/handle';

/*
 * The options popover
 */

const settingsDialog = () => html`
  <div
    class="dialog settings-dialog"
    @click=${closeSettingsDialog}
    id="settings-dialog"
  >
    <div class="dialog-content">
      ${generalSettings()}
      <hr />
      ${weatherSettings()}
      <hr />
      ${cloudSettings()}
    </div>
  </div>
`;

export default settingsDialog;
