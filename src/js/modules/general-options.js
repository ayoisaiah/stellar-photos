import Ladda from 'ladda';
import { validateCollections } from '../api';
import purify from '../libs/purify-dom';
import { $ } from '../libs/helpers';
import notifySnackbar from '../libs/notify-snackbar';
import generalPopoverView from '../components/general-popover-view';

/* CHROME_START */
import { defaultTab } from '../modules/chrome';
/* CHROME_END */

/*
 * Handle General Options
 */

const updateCollections = collections => {
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

const updatePhotoFrequency = selected => {
  chrome.storage.sync.set({ photoFrequency: selected });

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

  notifySnackbar('Preferences saved successfully');
};

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

const initializeCollections = () => {
  chrome.storage.sync.get('collections', d => {
    const { collections } = d;
    const collectionsInput = $('unsplash-collections__input');
    collectionsInput.value = collections;

    const collectionsForm = $('unsplash-collections');
    collectionsForm.addEventListener('submit', e => {
      e.preventDefault();
      const value = collectionsInput.value.trim().replace(/ /g, '');
      updateCollections(value);
    });
  });
};

const initializePhotoFrequency = () => {
  chrome.storage.sync.get('photoFrequency', res => {
    const { photoFrequency } = res;

    if (photoFrequency) {
      const selectPhotoFrequency = $('select-photo-frequency');
      selectPhotoFrequency.value = photoFrequency;
    } else {
      chrome.storage.sync.set({ photoFrequency: 'newtab' });
    }

    const savePhotoFrequency = $('save-photo-frequency');
    savePhotoFrequency.addEventListener('click', () => {
      const selectPhotoFrequency = $('select-photo-frequency');
      const selected =
        selectPhotoFrequency[selectPhotoFrequency.selectedIndex].value;
      updatePhotoFrequency(selected);
    });
  });
};

const intializeGeneralOptions = () => {
  const popoverView = $('popover-view');
  popoverView.insertAdjacentHTML(
    'afterbegin',
    purify.sanitize(generalPopoverView())
  );

  /* CHROME_START */
  const openDefaultTabButton = $('show-default-tab');
  openDefaultTabButton.addEventListener('click', openDefaultTab);

  const openChromeAppsButton = $('show-chrome-apps');
  openChromeAppsButton.addEventListener('click', openChromeApps);
  /* CHROME_END */

  initializeCollections();

  initializePhotoFrequency();
};

export default intializeGeneralOptions;
