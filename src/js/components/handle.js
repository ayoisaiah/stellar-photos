import saveToDropbox from './dropbox';
import { searchPhotos } from './search';
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

  const key = document.getElementById('searchForm-input').value;
  const page = 1;
  state.page = page;
  state.searchKey = key;
  state.results = [];

  searchPhotos(key, page);
};

export { handleClick, handleSubmit };
