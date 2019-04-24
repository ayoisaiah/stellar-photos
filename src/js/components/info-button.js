import { html } from 'lit-html';
import { togglePopover } from '../libs/helpers';

/*
 * Button for toggling information of the currently displayed photo
 */

const infoButton = () => html`
  <button
    @click=${togglePopover}
    title="Photo info"
    class="control-button info-button js-info-button"
  >
    <svg class="icon icon-info"><use href="#icon-info"></use></svg>
  </button>
`;

export default infoButton;
