import { html, TemplateResult } from 'lit-html';
import generalSettings from './general';
import weatherSettings from './weather';
import cloudSettings from './cloud';
import addonInfo from './info';
import { ChromeStorage } from '../types';

/*
 * The options popover
 */

const settingsDialog = (settings: ChromeStorage): TemplateResult => html`
  <div class="settings" id="settings-dialog">
    <div class="settings-content">
      ${generalSettings(settings)}
      <hr />
      ${weatherSettings(settings)}
      <hr />
      ${cloudSettings(settings)}
      <hr />
      ${addonInfo()}
    </div>
  </div>
`;

export default settingsDialog;
