import { searchPhotos } from '../modules/search';
import { saveToOneDrive } from './onedrive';
import { saveToDropbox } from './dropbox';
import { saveToGoogleDrive } from './googledrive';
import state from './state';
import observer from './observer';

const handleClick = (e) => {
  if (!e.target.matches('.cloud-button')) return;

  const { target } = e;
  const { imageid } = target.dataset;
  const { downloadurl } = target.dataset;

  if (target.classList.contains('dropbox-button')) {
    saveToDropbox(imageid, downloadurl);
    return;
  }

  if (target.classList.contains('onedrive-button')) {
    saveToOneDrive(imageid, downloadurl);
    return;
  }

  if (target.classList.contains('googledrive-button')) {
    saveToGoogleDrive(imageid, downloadurl);
  }
};

const handleSubmit = () => {
  const loadMore = document.querySelector('.moreResults-button');
  loadMore.classList.add('hidden');
  observer.observe(loadMore);

  const searchResults = document.querySelector('.searchResults');
  while (searchResults.hasChildNodes()) {
    searchResults.removeChild(searchResults.lastChild);
  }

  // Reset state
  state.page = 1;
  state.searchKey = document.getElementById('searchForm-input').value;
  state.results = [];
  state.incomingResults = [];

  searchPhotos(state.searchKey, state.page);
};

export { handleClick, handleSubmit };
