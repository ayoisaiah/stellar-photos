import Ladda from 'ladda';
import state from './state';
import displayPhotos from './displayPhotos';

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
  const loader = document.getElementById('loader');

  // Activate circular loader on first search
  if (page === 1) {
    loader.classList.add('loader-active');
  }

  const spinner = Ladda.create(document.querySelector('.moreResults-button'));
  // Activate More Results loader only when fetching subsequent pages
  if (page > 1) {
    spinner.start();
  }

  fetch(`https://stellar-photos.herokuapp.com/api/photos/search/${key},${page}`)
    .then(response => response.json())
    .then((json) => {
      state.isLoading = false;

      if (page === 1) {
        loader.classList.remove('loader-active');
      }

      if (page > 1) {
        spinner.stop();
      }

      if (json.photos.total === 0) {
        chrome.notifications.create('notify-search', {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: 'No images match your search',
          message: 'Try different or more general keywords',
        });

        return;
      }

      state.incomingResults = json.photos.results;
      state.results = [...state.results, ...state.incomingResults];
      displayPhotos(state.incomingResults, json.photos.total);
    })
    .catch(() => {
      state.isLoading = false;

      if (page === 1) {
        loader.classList.remove('loader-active');
      }

      if (page > 1) {
        spinner.stop();
      }

      const message = (navigator.onLine) ? 'Oh Snap! An error occurred' : 'There is no internet connection';

      chrome.notifications.create('notify-search', {
        type: 'basic',
        iconUrl: chrome.extension.getURL('icons/48.png'),
        title: 'Stellar Photos',
        message,
      });
    });
};

export { openSearch, closeSearch, searchPhotos };
