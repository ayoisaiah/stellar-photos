import loadingIndicator from './loading-indicator';
import { validateResponse } from './helpers';
import {
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
} from './notifications';

const authorizeDropbox = () => {
  const key = 'gscbxcjhou1jx21';
  chrome.tabs.create({ url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellarapp.photos/` });
};

const saveToDropbox = (imageId, downloadUrl) => {
  const dropboxToken = localStorage.getItem('dropbox');

  if (!dropboxToken) {
    authorizeDropbox();
    return;
  }

  loadingIndicator().start();

  fetch(`https://stellar-photos.herokuapp.com/api/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${dropboxToken}`)
    .then(validateResponse)
    .then(() => {
      loadingIndicator().stop();

      notifySaveToCloudSuccessful('Dropbox', imageId);
    })
    .catch(() => notifyUnableToUpload('Dropbox', imageId));
};

export { authorizeDropbox, saveToDropbox };
