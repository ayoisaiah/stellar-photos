import { html } from 'lit-html';
import { closeSearch, searchPhotos, searchState } from '../modules/search';
import displayPhotos from '../modules/display-photos';
import { $, chainableClassList } from '../libs/helpers';
import observer from '../libs/observer';

/*
 * This component represents the search form
 */

function handleSubmit() {
  // Empty search results
  displayPhotos([], 0);

  const loadMore = $('moreResults-button');
  loadMore.classList.add('hidden');
  observer.observe(loadMore);

  const uiElements = document.querySelectorAll('.s-ui');
  uiElements.forEach((element) => {
    chainableClassList(element).remove('no-pointer');
  });

  // Reset search state
  searchState.page = 1;
  searchState.query = $('searchForm-input').value;
  searchState.results = [];
  searchState.incomingResults = [];

  searchPhotos(searchState.query, searchState.page);
}

const ev = (event) => {
  event.preventDefault();
  closeSearch();
  handleSubmit();
};

function searchForm() {
  return html`
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
}

export default searchForm;
