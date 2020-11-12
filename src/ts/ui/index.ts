import { html, TemplateResult } from 'lit-html';
import { searchPhotos, searchState } from '../../js/modules/search';
import { handleClick } from '../../js/libs/handle';
import searchForm from '../../js/components/search-form';
import { $ } from '../../js/libs/helpers';
import { footer } from './footer';
import { ChromeLocalStorage } from '../types';

function toggleHistoryPane(): void {
  $('s-history')?.classList.toggle('open');
  $('s-footer')?.classList.toggle('history-open');
  $('historyButton')?.classList.toggle('transform');
}

function openSearch(): void {
  $('searchButton-open')?.classList.add('hidden');
  $('s-search')?.classList.add('search--open');
  $('searchForm-input')?.focus();
}

function hamburgerMenu(): TemplateResult {
  return html`
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
}

function searchButton(): TemplateResult {
  return html`
    <button
      @click=${openSearch}
      title="Find free hi-res photos"
      id="searchButton-open"
      class="searchButton searchButton-open"
      aria-label="Open search form"
    >
      <svg class="icon icon--search">
        <use href="#icon-search"></use>
      </svg>
    </button>
  `;
}

function ui(data: ChromeLocalStorage): TemplateResult {
  return html`
    <main class="s-main" id="s-main">
      <header class="header s-ui hide-ui" id="header">
        <div class="header-content" id="header-content">
          ${hamburgerMenu()} ${searchButton()}
        </div>
      </header>

      <div class="loader" id="loader"></div>

      <ul @click=${handleClick} class="searchResults" id="searchResults"></ul>

      ${searchForm()}

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

      <ul @click=${handleClick} class="s-history" id="s-history"></ul>

      ${footer(data)}
    </main>
  `;
}

export { ui };
