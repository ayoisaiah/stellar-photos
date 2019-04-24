import { html } from 'lit-html';
import { $ } from '../libs/helpers';

/*
 * Button that opens the settings dialog
 */

const openSettingsDialog = () => {
  const settingsDialog = $('settings-dialog');
  settingsDialog.classList.add('is-open');
};

const settingsButton = () => html`
  <button
    class="control-button js-options-button options-button"
    title="Settings"
    aria-label="Open settings dialog"
    @click=${openSettingsDialog}
  >
    <svg class="icon icon-settings">
      <use href="#icon-settings"></use>
    </svg>
  </button>
`;

export default settingsButton;
