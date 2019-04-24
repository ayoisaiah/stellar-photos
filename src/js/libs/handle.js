import * as Ladda from 'ladda';
import { searchPhotos } from '../modules/search';
import { saveToOneDrive } from './onedrive';
import { saveToDropbox } from './dropbox';
import { $, chainableClassList, removeChildElements as empty } from './helpers';
import state from './state';
import observer from './observer';
import loadingIndicator from './loading-indicator';
import { triggerPhotoDownload, validateCollections } from '../api';
import notifySnackbar from '../libs/notify-snackbar';

/* CHROME_START */
import { defaultTab } from '../modules/chrome';
/* CHROME_END */

/* CHROME_START */
const openDefaultTab = e => {
  e.preventDefault();
  chrome.tabs.update({
    url: defaultTab,
    active: true,
    highlighted: true,
  });
};

const openChromeApps = e => {
  e.preventDefault();
  chrome.tabs.update({
    url: 'chrome://apps/',
    active: true,
    highlighted: true,
  });
};
/* CHROME_END */

const closeSettingsDialog = event => {
  const { target } = event;
  if (target.id === 'settings-dialog') {
    const dialog = $('settings-dialog');
    dialog.classList.remove('is-open');
  }
};

const updateImageSource = event => {
  const { value } = event.target;
  chrome.storage.sync.set({ imageSource: value });
  const customCollection = document.querySelector('.custom-collection');

  if (value === 'custom') {
    customCollection.classList.add('is-visible');
  } else {
    customCollection.classList.remove('is-visible');
  }
};

const updatePhotoFrequency = event => {
  const selected = event.target[event.target.selectedIndex].value;
  chrome.storage.sync.set({ photoFrequency: selected });

  if (selected === 'newtab') {
    chrome.runtime.sendMessage({ command: 'load-data' });
  }

  if (selected === 'everyhour') {
    chrome.alarms.create('loadphoto', {
      periodInMinutes: 60,
    });
  }

  if (selected === 'everyday') {
    chrome.alarms.create('loadphoto', {
      periodInMinutes: 1440,
    });
  }
};

const updateCollections = () => {
  const collectionsInput = $('unsplash-collections__input');
  const collections = collectionsInput.value.trim().replace(/ /g, '');

  if (!collections) {
    notifySnackbar('Collection IDs not valid!', 'error');

    return;
  }

  const spinner = Ladda.create(document.querySelector('.update-collections'));
  spinner.start();

  validateCollections(collections)
    .then(() => {
      chrome.storage.sync.set({ collections }, () => {
        notifySnackbar('Collection saved successfully');
      });

      chrome.runtime.sendMessage({ command: 'load-data' });
    })
    .catch(() => {
      notifySnackbar(
        'Failed to save collections. Please check that the collection exist',
        'error'
      );
    })
    .finally(() => spinner.stop());
};

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

export {
  handleClick,
  handleSubmit,
  handleDownload,
  openChromeApps,
  openDefaultTab,
  updatePhotoFrequency,
  updateImageSource,
  updateCollections,
  closeSettingsDialog,
};
