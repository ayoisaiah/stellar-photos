import alertify from 'alertifyjs';
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
  const loader = document.getElementById('loader');
  if (page === 1) {
    loader.classList.add('loader-active');
  }
  const spinner = Ladda.create(document.querySelector('.moreResults-button'));
  spinner.start();
  fetch(`https://stellar-photos.herokuapp.com/api/photos/search/${key},${page}`)
    .then(response => response.json())
    .then((json) => {
      loader.classList.remove('loader-active');
      spinner.stop();
      if (json.photos.total === 0) {
        alertify.error('Oh Snap! No images match your search', 3, () => {});
        return;
      }
      state.incomingResults = json.photos.results;
      state.results = [...state.results, ...state.incomingResults];
      displayPhotos(state.incomingResults, json.photos.total);
    })
    .catch((error) => {
      loader.classList.remove('loader-active');
      spinner.stop();
      alertify.error('Oh Snap! An error occurred', 3, () => {});
    });
};

export { openSearch, closeSearch, searchPhotos };
