import * as Ladda from 'ladda';
import displayPhotos from './display-photos';
import { $, chainableClassList } from '../libs/helpers';
import loadingIndicator from '../libs/loading-indicator';
import state from '../libs/state';
import { searchPhotos as searchPhotosApi } from '../api';

const openSearch = () => {
  $('searchButton-open').classList.add('hidden');
  $('s-search').classList.add('search--open');
  $('searchForm-input').focus();
};

const closeSearch = () => {
  $('s-search').classList.remove('search--open');
  $('searchButton-open').classList.remove('hidden');
  $('searchForm-input').blur();
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

  searchPhotosApi(key, page)
    .then(json => {
      state.isLoading = false;

      if (json.total === 0) {
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

      state.incomingResults = json.results;
      state.results = [...state.results, ...state.incomingResults];
      displayPhotos(state.results, json.total);
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
  document.addEventListener('keyup', e => {
    if (e.keyCode === 27) {
      closeSearch();
    }
  });
};

export { openSearch, closeSearch, searchPhotos, initializeSearch };
