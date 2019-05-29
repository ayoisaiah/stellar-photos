import { html } from 'lit-html';
import { searchPhotos, searchState } from '../modules/search';
import { handleClick } from '../libs/handle';
import historyPane from './history-pane';
import searchForm from './search-form';

/*
 * The Main Component
 */

const main = history => html`
  <main class="s-main" id="s-main">
    <ul @click=${handleClick} class="searchResults" id="searchResults"></ul>

    <section class="moreResults">
      <button
        @click=${() => searchPhotos(searchState.query, searchState.page)}
        class="moreResults-button ladda-button hidden"
        id="moreResults-button"
        data-spinner-color="#ffffff"
        data-style="expand-right"
      >
        <span class="ladda-label">More Photos</span>
      </button>
    </section>
    ${historyPane(history)} ${searchForm()}
  </main>
`;

export default main;
