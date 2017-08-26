import Ladda from 'ladda';
import { success, error } from 'alertifyjs';
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
      action.insertAdjacentHTML('beforeend', '<button class="authorize">Authorize</button>');

      const authorize = document.querySelector('.authorize');
      if (selected === 'dropboxToken') {
        authorize.addEventListener('click', () => {
          authorizeDropbox();
        });
      }
    } else {
      action.insertAdjacentHTML('beforeend', '<span class="success-message">Authenticated</span>');
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
    success('Coordinates saved', 3);
    chrome.runtime.sendMessage({ command: 'update-weather' });
  });
};

const updateCollections = (collections) => {
  if (!collections) {
    error('Collection IDs not valid!');
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
        error(json.message, 3);
        return;
      }

      chrome.storage.sync.set({ collections });
      success(json.message, 3);
      chrome.runtime.sendMessage({ command: 'load-data' });
    }).catch(() => {
      spinner.stop();
      error('Oh Snap! An error occurred', 3);
    });
};

export { authorizeDropbox, cloudStatus, tempUnit, updateCoords, updateCollections };
