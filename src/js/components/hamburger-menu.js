import { html } from 'lit-html';
import { toggleHistoryPane } from '../modules/history';

/*
 * This component is for the hamburger menu that toggles the history pane
 */

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
