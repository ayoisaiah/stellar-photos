import loadingIndicator from './loading-indicator';
import { saveToDropboxApi, getDropboxKey } from '../api';
import {
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
} from './notifications';

async function authorizeDropbox() {
  try {
    const data = await getDropboxKey();
    const key = data.dropbox_key;
    chrome.tabs.create({
      url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://ayoisaiah.github.io/stellar-photos`,
    });
  } catch (err) {
    throw Error('Unable to authorize Dropbox');
  }
}

async function saveToDropbox(imageId) {
  try {
    const result = await chrome.storage.local.get('dropbox');
    const dropboxToken = result.dropbox;

    if (!dropboxToken) {
      await authorizeDropbox();
      return;
    }

    loadingIndicator().start();
    await saveToDropboxApi(imageId, dropboxToken);
    notifySaveToCloudSuccessful('Dropbox', imageId);
  } catch (err) {
    notifyUnableToUpload('Dropbox', imageId);
  } finally {
    loadingIndicator().stop();
  }
}

export { authorizeDropbox, saveToDropbox };
