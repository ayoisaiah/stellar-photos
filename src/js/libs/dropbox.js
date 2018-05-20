import loadingIndicator from './loading-indicator';
import { saveToDropboxApi } from '../api';
import {
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
} from './notifications';

const authorizeDropbox = () => {
  const key = 'gscbxcjhou1jx21';
  chrome.tabs.create({
    url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellarapp.photos/`,
  });
};

const saveToDropbox = (imageId, downloadUrl) => {
  const dropboxToken = localStorage.getItem('dropbox');

  if (!dropboxToken) {
    authorizeDropbox();
    return;
  }

  loadingIndicator().start();

  saveToDropboxApi(imageId, downloadUrl, dropboxToken)
    .then(() => {
      loadingIndicator().stop();

      notifySaveToCloudSuccessful('Dropbox', imageId);
    })
    .catch(() => notifyUnableToUpload('Dropbox', imageId));
};

export { authorizeDropbox, saveToDropbox };
