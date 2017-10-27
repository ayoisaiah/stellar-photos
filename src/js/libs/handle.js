import saveToDropbox from './dropbox';
import { searchPhotos } from '../modules/search';
import state from './state';
import observer from './observer';

const handleClick = (e) => {
  if (!e.target.matches('.icon--cloud')) return;
  const target = e.target;
  const imageid = target.dataset.imageid;
  const downloadurl = target.dataset.downloadurl;
  saveToDropbox(imageid, downloadurl);
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
