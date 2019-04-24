import { html } from 'lit-html';
import { closeSearch } from '../modules/search';
import { handleSubmit } from '../libs/handle';

/*
 * This component represents the search form
 */

const ev = event => {
  event.preventDefault();
  closeSearch();
  handleSubmit();
};

const searchForm = () => html`
  <section class="s-search" id="s-search" style="opacity: 0">
    <button
      @click=${closeSearch}
      id="searchButton-close"
      class="searchButton searchButton-close"
      aria-label="Close search form"
    >
      <svg class="icon icon--cross">
        <use xlink:href="#icon-cross"></use>
      </svg>
    </button>
    <form @submit=${ev} class="searchForm" id="searchForm" action="">
      <input
        class="searchForm-input"
        id="searchForm-input"
        name="search"
        type="search"
        placeholder="find free hi-res photos"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <span class="searchForm-info">Hit Enter to search or ESC to close</span>
    </form>
  </section>
`;

export default searchForm;
