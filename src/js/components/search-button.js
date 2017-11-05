/*
 * This component outputs the search button
 */

const searchButton = () => `
    <button id="searchButton-open" class="s-ui searchButton searchButton-open hidden" aria-label="Open search form" style="position:fixed; width: 40px; height: 40px; top: 20px; right: 20px;">
      <svg class="icon icon--search">
        <use xlink:href="#icon-search"></use>
      </svg>
    </button>
  `;

export default searchButton;
