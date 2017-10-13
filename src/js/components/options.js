import Ladda from 'ladda';
import purify from './purify-dom';
import saveToDropbox from './dropbox';

const authorizeDropbox = (imageId, downloadUrl) => {
  const key = 'gscbxcjhou1jx21';
  chrome.tabs.create({ url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellarapp.photos/` });

  chrome.storage.local.get('dropboxToken', (result) => {
    const { dropboxToken } = result;

    const interval = setInterval(() => {
      if (dropboxToken) {
        if (imageId) {
          saveToDropbox(imageId, downloadUrl);
        }

        clearInterval(interval);
      }
    }, 100);
  });
};

const cloudStatus = (selectCloud) => {
  const selected = selectCloud[selectCloud.selectedIndex].value;
  const action = document.querySelector('.action');
  while (action.hasChildNodes()) {
    action.removeChild(action.lastChild);
  }

  chrome.storage.local.get(`${selected}`, (result) => {
    if (!result[`${selected}`]) {
      action.insertAdjacentHTML('beforeend', purify.sanitize('<button class="authorize">Authorize</button>'));

      const authorize = document.querySelector('.authorize');
      if (selected === 'dropboxToken') {
        authorize.addEventListener('click', () => {
          authorizeDropbox();
        });
      }
    } else {
      action.insertAdjacentHTML('beforeend', purify.sanitize('<span class="success-message">Authenticated</span>'));
    }
  });
};

const tempUnit = (selectTempUnit) => {
  const selected = selectTempUnit[selectTempUnit.selectedIndex].value;
  chrome.storage.sync.set({ tempUnit: selected });
  chrome.runtime.sendMessage({ command: 'update-weather' });
};

const updateCoords = (coords) => {
  chrome.storage.sync.set({ coords }, () => {
    chrome.notifications.create('update-coords', {
      type: 'basic',
      iconUrl: chrome.extension.getURL('icons/48.png'),
      title: 'Stellar Photos',
      message: 'Coordinates updated successfully',
    });

    chrome.runtime.sendMessage({ command: 'update-weather' });
  });
};

const updateCollections = (collections) => {
  if (!collections) {
    chrome.notifications.create('update-collections', {
      type: 'basic',
      iconUrl: chrome.extension.getURL('icons/48.png'),
      title: 'Stellar Photos',
      message: 'Collection IDs not valid!',
    });

    return;
  }

  const spinner = Ladda.create(document.querySelector('.update-collections'));
  spinner.start();

  fetch(`https://stellar-photos.herokuapp.com/api/validate/${collections}`)
    .then(response => response.text())
    .then((data) => {
      spinner.stop();
      const json = JSON.parse(data);
      if (json.error) {
        chrome.notifications.create('update-collections', {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: 'Stellar Photos',
          message: json.message,
        });
        return;
      }

      chrome.storage.sync.set({ collections });
      chrome.notifications.create('update-collections', {
        type: 'basic',
        iconUrl: chrome.extension.getURL('icons/48.png'),
        title: 'Stellar Photos',
        message: json.message,
      });
      chrome.runtime.sendMessage({ command: 'load-data' });
    }).catch(() => {
      spinner.stop();
      chrome.notifications.create('update-collections', {
        type: 'basic',
        iconUrl: chrome.extension.getURL('icons/48.png'),
        title: 'Stellar Photos',
        message: 'Oh Snap! An error occurred',
      });
    });
};

export { authorizeDropbox, cloudStatus, tempUnit, updateCoords, updateCollections };
