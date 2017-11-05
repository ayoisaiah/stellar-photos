import Ladda from 'ladda';
import purify from '../libs/purify-dom';
import { authorizeDropbox } from '../libs/dropbox';
import { togglePopover } from '../libs/helpers';
import optionsPopover from '../components/options-popover';

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

const loadOptions = () => {
  const controls = document.querySelector('.controls');

  controls.insertAdjacentHTML('afterbegin', purify.sanitize(`
    ${optionsPopover()}
    
      `, { ADD_TAGS: ['use'] }));

  const optionsButton = document.querySelector('.options-button');
  optionsButton.addEventListener('click', () => {
    togglePopover('.options-popover');
  });

  const selectCloud = document.querySelector('.chooseCloudStorage');
  selectCloud.addEventListener('change', () => {
    cloudStatus(selectCloud);
  });

  cloudStatus(selectCloud);

  const selectTempUnit = document.querySelector('.chooseTempUnit');
  selectTempUnit.addEventListener('change', () => {
    tempUnit(selectTempUnit);
  });

  chrome.storage.sync.get('tempUnit', (d) => {
    if (!d.tempUnit) {
      tempUnit(selectTempUnit);
    } else {
      const unit = d.tempUnit;
      selectTempUnit.value = unit;
    }
  });

  chrome.storage.sync.get('collections', (d) => {
    const { collections } = d;
    const collectionsInput = document.querySelector('.s-collections__input');
    collectionsInput.value = collections;

    const collectionsForm = document.querySelector('.s-collections');
    collectionsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = collectionsInput.value.trim().replace(/ /g, '');
      updateCollections(value);
    });
  });


  const weatherCoords = document.querySelector('.weather-coords');
  weatherCoords.addEventListener('submit', (e) => {
    e.preventDefault();
    const longitude = document.querySelector('.longitude').value;
    const latitude = document.querySelector('.latitude').value;
    if (typeof Number(longitude) === 'number' && longitude <= 180 && longitude >= -180
     && typeof Number(latitude) === 'number' && latitude <= 90 && latitude >= -90) {
      const coords = {
        longitude,
        latitude,
      };
      updateCoords(coords);
    }
  });


  chrome.storage.sync.get('coords', (d) => {
    const { coords } = d;
    if (coords) {
      const longitudeInput = document.querySelector('.longitude');
      const latitudeInput = document.querySelector('.latitude');
      const { longitude, latitude } = coords;
      longitudeInput.value = longitude;
      latitudeInput.value = latitude;
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    switch (request.command) {
      case 'update-cloud-status': {
        cloudStatus(selectCloud);
        break;
      }
    }
  });
};

export { cloudStatus, tempUnit, updateCoords, updateCollections, loadOptions };
