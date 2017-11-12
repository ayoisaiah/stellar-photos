/*
 * This component represents the search form
 */

const searchForm = () => `
    <section class="s-search" id="s-search" style="opacity: 0">
      <button id="searchButton-close" class="searchButton searchButton-close" aria-label="Close search form">
        <svg class="icon icon--cross">
          <use xlink:href="#icon-cross"></use>
        </svg>
      </button>
      <form class="searchForm" id="searchForm" action="">
        <input class="searchForm-input" id="searchForm-input" name="search" type="search" placeholder="find free hi-res photos" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
        <span class="searchForm-info">Hit Enter to search or ESC to close</span>
      </form>
    </section>
`;

export default searchForm;
