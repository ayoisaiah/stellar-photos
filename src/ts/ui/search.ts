import * as Ladda from 'ladda';
import { html, TemplateResult, render } from 'lit-html';
import { $ } from '../helpers';
import { loadingIndicator } from './loading';
import { searchPhotos } from '../requests';
import { notifyNoSearchResults } from '../notifications';
import { UnsplashImage, UnsplashSearch } from '../types/unsplash';
import { photoCard } from './photo-card';
import { snackbar } from './snackbar';
import { ChromeLocalStorage } from '../types';

interface State {
  query: string;
  page: number;
  results: UnsplashImage[];
  isLoading: boolean;
}

const state: State = {
  query: '',
  page: 1,
  results: [],
  isLoading: false,
};

const options = {
  // If user scrolls within 1200px of the `More Photos` button, request next page
  rootMargin: '1200px 0px',
  threshold: 1.0,
};

function loadMoreResults(entries: IntersectionObserverEntry[]): void {
  entries.forEach((entry: IntersectionObserverEntry) => {
    // If new search or if ongoing search
    if (state.page === 1 || state.isLoading) return;

    // If transitioning to a state of intersection
    if (entry.isIntersecting) {
      searchUnsplash(state.query, state.page);
    }
  });
}

const observer = new IntersectionObserver(loadMoreResults, options);

async function displayPhotos(photos: UnsplashImage[]): Promise<void> {
  const searchResults = $('js-search-results');
  const data: {
    cloudService?: ChromeLocalStorage['cloudService'];
  } = (await chrome.storage.local.get(['cloudService'])) as ChromeLocalStorage;
  const { cloudService } = data;

  if (searchResults) {
    const h = html`${photos.map((photo) => photoCard(photo, cloudService))}`;
    render(h, searchResults);
  }
}

async function searchUnsplash(key: string, page: number): Promise<void> {
  // Activate circular loader on first search
  if (page === 1) {
    loadingIndicator().start();
  }

  state.isLoading = true;

  const moreButton = $('js-more-results');
  const spinner = Ladda.create(moreButton as HTMLButtonElement);

  // Activate More Results loader only when fetching subsequent pages
  if (page > 1) {
    spinner.start();
  }

  try {
    const response = await searchPhotos(key, page);
    const json: UnsplashSearch = await response.json();

    UnsplashSearch.check(json);

    if (json.total === 0) {
      notifyNoSearchResults();
      return;
    }

    state.results = [...state.results, ...json.results];
    displayPhotos(state.results);
    $('body')?.classList.remove('no-bounce');

    if (state.results.length >= json.total) {
      moreButton?.classList.add('hidden');
      observer.disconnect();
      return;
    }

    state.page += 1;
    if (moreButton) {
      moreButton.classList.remove('hidden');
      observer.observe(moreButton);
    }
  } catch (err) {
    const message = navigator.onLine
      ? 'An unexpected error occured while searching Unsplash'
      : 'There was a network error while searching Unsplash. Please check your internet connection';

    snackbar(message, 'error');
    observer.disconnect();
  } finally {
    state.isLoading = false;

    if (page === 1) {
      loadingIndicator().stop();
    }

    if (page > 1) {
      spinner.stop();
    }
  }
}

function closeForm(): void {
  $('js-search')?.classList.remove('search--open');
  $('js-open-search')?.classList.remove('hidden');
  $('js-search-input')?.blur();
}

function handleSubmit(event: KeyboardEvent): void {
  event.preventDefault();
  closeForm();

  const input = $('js-search-input');

  // Reset search state
  state.page = 1;
  if (input) {
    state.query = (input as HTMLInputElement).value;
  }
  state.results = [];

  displayPhotos([]); // Empty previous results
  searchUnsplash(state.query, state.page);
}

document.addEventListener('keyup', (event: KeyboardEvent) => {
  if (event.key === 'Escape' || event.key === 'Esc') {
    closeForm();
  }
});

function search(): TemplateResult {
  return html`
    <section class="search-container">
      <div class="results-container">
        <ul class="searchResults" id="js-search-results"></ul>
        <div class="load-more">
          <button
            class="moreResults-button ladda-button hidden"
            id="js-more-results"
            data-spinner-color="#ffffff"
            data-style="expand-right"
            @click=${() => searchUnsplash(state.query, state.page)}
          >
            <span class="ladda-label">More Photos</span>
          </button>
        </div>
      </div>
      <section class="s-search" id="js-search" style="opacity: 0">
        <button
          @click=${closeForm}
          id="js-close-search"
          class="searchButton searchButton-close"
          aria-label="Close search form"
        >
          <svg class="icon icon--cross">
            <use xlink:href="#icon-cross"></use>
          </svg>
        </button>
        <form @submit=${handleSubmit} class="searchForm" id="js-search-form">
          <input
            class="searchForm-input"
            id="js-search-input"
            name="search"
            type="search"
            placeholder="find free hi-res photos"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <span class="searchForm-info"
            >Hit Enter to search or ESC to close</span
          >
        </form>
      </section>
    </section>
  `;
}

export { search };
