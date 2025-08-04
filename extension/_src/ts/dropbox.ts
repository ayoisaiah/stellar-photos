import { loadingIndicator } from './ui/loading';
import { saveToDropboxApi, getDropboxKey } from './requests';
import {
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
} from './notifications';
import { getFromChromeLocalStorage } from './helpers';

async function openDropboxAuthPage(): Promise<void> {
  const response = await getDropboxKey();
  const data: { dropbox_key: string } = await response.json();
  const key = data.dropbox_key;
  chrome.tabs.create({
    url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellar.freshman.tech`,
  });
}

async function saveToDropbox(imageId: string, url: string): Promise<void> {
  try {
    const localData = await getFromChromeLocalStorage('dropbox');
    const dropboxToken = localData.dropbox;

    if (!dropboxToken) {
      await openDropboxAuthPage();
      return;
    }

    loadingIndicator().start();
    await saveToDropboxApi(imageId, dropboxToken, url);
    notifySaveToCloudSuccessful('Dropbox', imageId);
  } catch (err) {
    notifyUnableToUpload('Dropbox', imageId);
  } finally {
    loadingIndicator().stop();
  }
}

export { openDropboxAuthPage, saveToDropbox };
