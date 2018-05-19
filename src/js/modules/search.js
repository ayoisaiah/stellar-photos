import Ladda from 'ladda';
import displayPhotos from './display-photos';
import purify from '../libs/purify-dom';
import state from '../libs/state';
import { $, chainableClassList } from '../libs/helpers';
import { handleClick, handleSubmit } from '../libs/handle';
import loadingIndicator from '../libs/loading-indicator';
import searchButton from '../components/search-button';
import searchForm from '../components/search-form';

const openSearch = () => {
  document.getElementById('searchButton-open').classList.add('hidden');
  document.getElementById('s-search').classList.add('search--open');
  document.getElementById('searchForm-input').focus();
};

const closeSearch = () => {
  document.getElementById('s-search').classList.remove('search--open');
  document.getElementById('searchButton-open').classList.remove('hidden');
  document.getElementById('searchForm-input').blur();
};

const searchPhotos = (key, page) => {
  state.isLoading = true;

  // Activate circular loader on first search
  if (page === 1) {
    loadingIndicator().start();
  }

  const spinner = Ladda.create(document.querySelector('.moreResults-button'));
  // Activate More Results loader only when fetching subsequent pages
  if (page > 1) {
    spinner.start();
  }

  fetch(`http://localhost:8080/search-unsplash/${key},${page}`)
    .then(response => response.json())
    .then(json => {
      state.isLoading = false;

      if (json.photos.total === 0) {
        chrome.notifications.create('notify-search', {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: 'No images match your search',
          message: 'Try different or more general keywords',
        });

        return;
      }

      const uiElements = document.querySelectorAll('.s-ui');
      uiElements.forEach(element => {
        chainableClassList(element).remove('hide-ui');
        chainableClassList(element).add('no-pointer');
      });

      state.incomingResults = json.photos.results;
      state.results = [...state.results, ...state.incomingResults];
      displayPhotos(state.incomingResults, json.photos.total);
    })
    .catch(() => {
      state.isLoading = false;

      const message = navigator.onLine
        ? 'Oh Snap! An error occurred'
        : 'There is no internet connection';

      chrome.notifications.create('notify-search', {
        type: 'basic',
        iconUrl: chrome.extension.getURL('icons/48.png'),
        title: 'Stellar Photos',
        message,
      });
    })
    .finally(() => {
      if (page === 1) {
        loadingIndicator().stop();
      }

      if (page > 1) {
        spinner.stop();
      }
    });
};

const initializeSearch = () => {
  const headerContent = $('header-content');
  headerContent.insertAdjacentHTML(
    'beforeend',
    purify.sanitize(searchButton(), {
      ADD_TAGS: ['use'],
    })
  );

  const main = document.querySelector('.s-main');
  main.insertAdjacentHTML(
    'beforeend',
    purify.sanitize(searchForm(), {
      SANITIZE_DOM: false,
      ADD_TAGS: ['use'],
    })
  );

  const loadMore = document.querySelector('.moreResults-button');
  loadMore.addEventListener('click', () =>
    searchPhotos(state.searchKey, state.page)
  );

  const searchButtonOpen = document.getElementById('searchButton-open');
  searchButtonOpen.addEventListener('click', openSearch);

  const searchButtonClose = document.getElementById('searchButton-close');
  searchButtonClose.addEventListener('click', closeSearch);

  document.addEventListener('keyup', e => {
    if (e.keyCode === 27) {
      closeSearch();
    }
  });

  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    closeSearch();
    handleSubmit();
  });

  document
    .getElementById('searchResults')
    .addEventListener('click', handleClick);
};

export { openSearch, closeSearch, searchPhotos, initializeSearch };
