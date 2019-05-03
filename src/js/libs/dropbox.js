import loadingIndicator from './loading-indicator';
import { saveToDropboxApi, getDropboxKey } from '../api';
import {
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
} from './notifications';
import notifySnackbar from './notify-snackbar';

const authorizeDropbox = () => {
  loadingIndicator().start();

  getDropboxKey()
    .then(data => {
      const key = data.Dropbox_key;
      chrome.tabs.create({
        url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://ayoisaiah.github.io/stellar-photos`,
      });
    })
    .catch(() => notifySnackbar('Unable to authorize Dropbox', 'error'))
    .finally(() => loadingIndicator().stop());
};

const saveToDropbox = imageId => {
  chrome.storage.local.get('dropbox', result => {
    const dropboxToken = result.dropbox;

    if (!dropboxToken) {
      authorizeDropbox();
      return;
    }

    loadingIndicator().start();

    saveToDropboxApi(imageId, dropboxToken)
      .then(() => {
        loadingIndicator().stop();

        notifySaveToCloudSuccessful('Dropbox', imageId);
      })
      .catch(() => notifyUnableToUpload('Dropbox', imageId));
  });
};

export { authorizeDropbox, saveToDropbox };
