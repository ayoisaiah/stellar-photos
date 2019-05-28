import { html } from 'lit-html';
import { $ } from '../libs/helpers';

/*
 * This component is for the hamburger menu that toggles the history pane
 */

const toggleHistoryPane = () => {
  $('s-history').classList.toggle('open');
  $('s-footer').classList.toggle('history-open');
  $('historyButton').classList.toggle('transform');
};

const hamburgerMenu = () => html`
  <button
    @click=${toggleHistoryPane}
    id="historyButton"
    class="historyButton historyButton-open"
    title="toggle history menu"
    aria-label="Toggle History Menu"
  >
    <div>
      <i class="bar1"></i>
      <i class="bar2"></i>
      <i class="bar3"></i>
    </div>
  </button>
`;

export default hamburgerMenu;
