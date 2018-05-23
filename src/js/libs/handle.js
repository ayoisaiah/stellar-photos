import { searchPhotos } from '../modules/search';
import { saveToOneDrive } from './onedrive';
import { saveToDropbox } from './dropbox';
import { $, chainableClassList, removeChildElements as empty } from './helpers';
import state from './state';
import observer from './observer';
import loadingIndicator from './loading-indicator';
import { triggerPhotoDownload } from '../api';

const handleDownload = imageid => {
  loadingIndicator().start();

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

const handleClick = e => {
  if (!e.target.matches('button')) return;

  const { target } = e;
  const { imageid } = target.dataset;

  if (target.classList.contains('dropbox-button')) {
    saveToDropbox(imageid);
    return;
  }

  if (target.classList.contains('onedrive-button')) {
    saveToOneDrive(imageid);
    return;
  }

  if (target.classList.contains('download-button')) {
    handleDownload(imageid);
  }
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
