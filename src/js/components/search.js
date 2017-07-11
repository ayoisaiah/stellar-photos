import alertify from 'alertifyjs';
import state from './state';
import displayPhotos from './displayPhotos';

const openSearch = () => {
  document.getElementById('s-search').classList.add('search--open');
  document.getElementById('searchForm-input').focus();
};

const closeSearch = () => {
  document.getElementById('s-search').classList.remove('search--open');
  document.getElementById('searchForm-input').blur();
};

const searchPhotos = (key, page) => {
  fetch(`http://localhost:3000/api/photos/search/${key},${page}`)
    .then(response => response.json())
    .then((json) => {
      if (json.photos.total === 0) {
        alertify.error('Oh Snap! No images match your search', 3, () => {});
        return;
      }
      state.incomingResults = json.photos.results;
      state.results = [...state.results, ...state.incomingResults];
      displayPhotos(state.incomingResults, json.photos.total);
    })
    .catch(error => {
      alertify.error('Oh Snap! An error occurred', 3, () => {});
      console.log(error);
    });
};

export { openSearch, closeSearch, searchPhotos };
