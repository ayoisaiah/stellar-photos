import alertify from 'alertifyjs';
import saveToDropbox from './dropbox';

const authorizeDropbox = (imageId, downloadUrl) => {
  const key = 'gscbxcjhou1jx21';
  chrome.tabs.create({ url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellarapp.photos/` });

  const interval = setInterval(() => {
    const token = localStorage.getItem('dropbox-token');
    if (token) {
      if (imageId) {
        saveToDropbox(imageId, downloadUrl);
      }
      clearInterval(interval);
    }
  }, 100);
};

const cloudStatus = (selectCloud) => {
  const selected = selectCloud[selectCloud.selectedIndex].value;
  const action = document.querySelector('.action');
  while (action.hasChildNodes()) {
    action.removeChild(action.lastChild);
  }

  if (!localStorage.getItem(`${selected}`)) {
    action.insertAdjacentHTML('beforeend', '<button class="authorize">Authorize</button>');
    const authorize = document.querySelector('.authorize');
    if (selected === 'dropbox-token') {
      authorize.addEventListener('click', () => {
        authorizeDropbox();
      });
    }
  } else {
    action.insertAdjacentHTML('beforeend', '<span class="success-message">Authenticated</span>');
  }
};

const tempUnit = (selectTempUnit) => {
  const selected = selectTempUnit[selectTempUnit.selectedIndex].value;
  localStorage.setItem('s-tempUnit', selected);
  chrome.runtime.sendMessage({ command: 'update-weather' });
};

const updateCoords = (coords) => {
  chrome.storage.sync.set({
    's-coords': coords,
  }, () => {
    localStorage.setItem('s-coords', JSON.stringify(coords));
    alertify.success('Coordinates saved', 3);
  });

  chrome.runtime.sendMessage({ command: 'update-weather' });
};

export { authorizeDropbox, cloudStatus, tempUnit, updateCoords };
