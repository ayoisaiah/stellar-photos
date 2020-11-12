import { html, render } from 'lit-html';
import { searchPhotos, searchState } from '../modules/search';
import displayPhotos from '../modules/display-photos';
import { saveToOneDrive } from './onedrive';
import { saveToDropbox } from './dropbox';
import { $, chainableClassList } from './helpers';
import observer from './observer';
import loadingIndicator from './loading-indicator';
import { triggerPhotoDownload } from '../api';
import notifySnackbar from './notify-snackbar';
// import { footerContent } from '../components/footer';

const handleDownload = (imageid) => {
  loadingIndicator().start();

  triggerPhotoDownload(imageid)
    .then((data) => {
      loadingIndicator().stop();
      const { url, id } = data;

      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `photo-${id}`);
      a.setAttribute('style', 'opacity: 0;');

      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    })
    .catch(() => {
      notifySnackbar('Download failed', 'error');
      loadingIndicator().stop();
    });
};

async function setBackgroundFromHistory(imageid) {
  const localData = await chrome.storage.local.get();
  const arr = localData.history.filter((e) => e.id === imageid);
  const image = arr[0];

  $('body').style.backgroundImage = `url(${image.base64})`;

  // TODO: Update Image info
}

const handleClick = (e) => {
  if (!e.target.matches('button')) return;

  const { target } = e;
  const { imageid } = target.dataset;

  if (target.classList.contains('bg-button')) {
    setBackgroundFromHistory(imageid);
    return;
  }

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
  // Empty search results
  displayPhotos([], 0);

  const loadMore = $('moreResults-button');
  loadMore.classList.add('hidden');
  observer.observe(loadMore);

  const uiElements = document.querySelectorAll('.s-ui');
  uiElements.forEach((element) => {
    chainableClassList(element).remove('no-pointer');
  });

  // Reset search state
  searchState.page = 1;
  searchState.query = $('searchForm-input').value;
  searchState.results = [];
  searchState.incomingResults = [];

  searchPhotos(searchState.query, searchState.page);
};

export { handleClick, handleSubmit, handleDownload };
