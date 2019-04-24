import { html } from 'lit-html';
import historyPane from './history-pane';

/*
 * The Main Component
 */

const main = () => html`
  <main class="s-main" id="s-main">
    <ul class="searchResults" id="searchResults"></ul>

    <section class="moreResults">
      <button
        class="moreResults-button ladda-button hidden"
        id="moreResults-button"
        data-spinner-color="#ffffff"
        data-style="expand-right"
      >
        <span class="ladda-label">More Photos</span>
      </button>
    </section>
    ${historyPane()}
  </main>
`;

export default main;
