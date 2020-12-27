import { render } from 'lit-html';
import 'chrome-extension-async';
import settingsDialog from './settings/index';
import { $ } from './helpers';
import { ChromeStorage, ChromeLocalStorage, ChromeSyncStorage } from './types';

async function getStorageData(): Promise<ChromeStorage> {
  const localData: ChromeLocalStorage = await chrome.storage.local.get();

  const syncData: ChromeSyncStorage = await chrome.storage.sync.get();

  return Object.assign(syncData, localData);
}

async function renderSettings(): Promise<void> {
  try {
    const data = await getStorageData();

    const body = $('js-body');
    if (body) {
      render(settingsDialog(data), body);
    }
  } catch (err) {
    // eslint-disable-next-line
    console.log(err);
  }
}

renderSettings();
