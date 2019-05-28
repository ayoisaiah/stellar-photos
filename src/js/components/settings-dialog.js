import { html } from 'lit-html';
import generalSettings from './general-settings';
import weatherSettings from './weather-settings';
import cloudSettings from './cloud-settings';
import { closeSettingsDialog } from '../libs/handle';

/*
 * The options popover
 */

const settingsDialog = settings => html`
  <div
    class="dialog settings-dialog"
    @click=${closeSettingsDialog}
    id="settings-dialog"
  >
    <div class="dialog-content">
      ${generalSettings(settings)}
      <hr />
      ${weatherSettings(settings)}
      <hr />
      ${cloudSettings(settings)}
    </div>
  </div>
`;

export default settingsDialog;
