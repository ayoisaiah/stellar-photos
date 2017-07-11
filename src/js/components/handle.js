import saveToDropbox from './dropbox';
import { searchPhotos } from './search';
import state from './state';

const handleClick = (e) => {
  console.log(e.target);

  if (e.target.matches('.icon--download')) {
    const downloadIcon = e.target;
    downloadIcon.classList.add('icon-active');
    setTimeout(() => {
      downloadIcon.classList.remove('icon-active');
    }, 500);
    return;
  }

  if (!e.target.matches('.icon--cloud')) return;
  const target = e.target;
  const imageid = target.dataset.imageid;
  const downloadurl = target.dataset.downloadurl;
  saveToDropbox(imageid, downloadurl);
};

const handleSubmit = () => {
  const loadMore = document.querySelector('.moreResults-button');
  loadMore.classList.add('hidden');
  const searchResults = document.querySelector('.searchResults');
  searchResults.innerHTML = '';
  const key = document.getElementById('searchForm-input').value;
  const page = 1;
  state.page = page;
  state.searchKey = key;
  state.results = [];

  searchPhotos(key, page);
};

export { handleClick, handleSubmit };
