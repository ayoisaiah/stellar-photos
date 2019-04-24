import { html } from 'lit-html';
import { handleClick } from '../libs/handle';

/*
 * This component represents the history menu
 */

const historyPane = () =>
  html`
    <ul @click=${handleClick} class="s-history" id="s-history"></ul>
  `;

export default historyPane;
