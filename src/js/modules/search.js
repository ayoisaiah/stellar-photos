import * as Ladda from 'ladda';
import displayPhotos from './display-photos';
import { $, chainableClassList } from '../libs/helpers';
import loadingIndicator from '../libs/loading-indicator';
import { searchPhotos as searchPhotosApi } from '../api';
import {
  notifyNoSearchResults,
  notifySearchError,
} from '../libs/notifications';
import notifySnackbar from '../libs/notify-snackbar';

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

const searchState = {
  query: '',
  results: [],
  incomingResults: [],
  page: 1,
  isLoading: false,
};

const searchPhotos = (key, page) => {
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
      if (json.total === 0) {
        notifyNoSearchResults();
        return;
      }

      const uiElements = document.querySelectorAll('.s-ui');
      uiElements.forEach(element => {
        chainableClassList(element).remove('hide-ui');
        chainableClassList(element).add('no-pointer');
      });

      searchState.incomingResults = json.results;
      searchState.results = [
        ...searchState.results,
        ...searchState.incomingResults,
      ];
      displayPhotos(searchState.results, json.total);
    })
    .catch(() => {
      const message = navigator.onLine
        ? 'An unexpected error occured while searching Unsplash'
        : 'There was a network error. Please check your internet connection';

      if (page === 1) {
        notifySearchError(message);
      }

      if (page > 1) {
        notifySnackbar(message);
      }
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

export { openSearch, closeSearch, searchPhotos, searchState };
