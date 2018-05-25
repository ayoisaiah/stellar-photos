/*
 * This component outputs the search button
 */

const searchButton = () => `
    <button title="Find free hi-res photos" id="searchButton-open"
    class="searchButton js-track-click searchButton-open"
    data-track='click-search'
    data-label="Open search form"
    aria-label="Open search form">
      <svg class="icon icon--search">
        <use xlink:href="#icon-search"></use>
      </svg>
    </button>
  `;

export default searchButton;
