import { searchPhotos } from '../modules/search';
import { saveToOneDrive } from './onedrive';
import { saveToDropbox } from './dropbox';
import { $, chainableClassList, removeChildElements as empty } from './helpers';
import state from './state';
import observer from './observer';
import loadingIndicator from './loading-indicator';
import { triggerPhotoDownload } from '../api';

const handleClick = e => {
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
  }
};

const handleDownload = downloadBtn => {
  loadingIndicator().start();
  const { imageid } = downloadBtn.dataset;
  triggerPhotoDownload(imageid)
    .then(data => {
      loadingIndicator().stop();
      const { url, id } = data;
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `photo-${id}`);
      a.setAttribute('style', 'opacity: 0;');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    })
    .catch(() => {
      loadingIndicator().stop();
    });
};

const handleSubmit = () => {
  const loadMore = $('moreResults-button');
  loadMore.classList.add('hidden');
  observer.observe(loadMore);

  const searchResults = $('searchResults');
  empty(searchResults);

  const uiElements = document.querySelectorAll('.s-ui');
  uiElements.forEach(element => {
    chainableClassList(element).remove('no-pointer');
  });

  // Reset state
  state.page = 1;
  state.searchKey = $('searchForm-input').value;
  state.results = [];
  state.incomingResults = [];

  searchPhotos(state.searchKey, state.page);
};

export { handleClick, handleSubmit, handleDownload };
