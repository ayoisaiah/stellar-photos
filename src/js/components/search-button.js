/*
 * This component outputs the search button
 */

const searchButton = () => `
    <button id="searchButton-open" class="searchButton searchButton-open"
    aria-label="Open search form">
      <svg class="icon icon--search">
        <use xlink:href="#icon-search"></use>
      </svg>
    </button>
  `;

export default searchButton;
