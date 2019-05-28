import { html } from 'lit-html';
import { handleClick } from '../libs/handle';
import cloudButton from '../libs/cloud-button';
import photoCard from '../components/photo-card';

/*
 * This component represents the history menu
 */

const historyPane = history =>
  html`
    <ul @click=${handleClick} class="s-history" id="s-history">
      ${history.map(photo => photoCard(photo, cloudButton))}
    </ul>
  `;

export default historyPane;
