import { render } from 'lit-html';
import 'chrome-extension-async';
import settingsDialog from './settings/index';
import { ChromeStorage, ChromeLocalStorage, ChromeSyncStorage } from './types';

async function getStorageData(): Promise<ChromeStorage> {
  const localData: ChromeLocalStorage = await chrome.storage.local.get([
    'cloudService',
    'dropbox',
    'onedrive',
    'forecast',
    'photoFrequency',
  ]);

  const syncData: ChromeSyncStorage = await chrome.storage.sync.get();

  return Object.assign(syncData, localData);
}

async function renderSettings(): Promise<void> {
  try {
    const data = await getStorageData();

    const body = document.querySelector('.js-body');
    if (body) {
      render(settingsDialog(data), body);
    }
  } catch (err) {
    // eslint-disable-next-line
    console.log(err);
  }
}

renderSettings();
