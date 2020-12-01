import { render } from 'lit-html';
import 'chrome-extension-async';
import { $ } from './helpers';
import eventListeners from '../js/libs/event-listeners';
import { ui } from './ui';
import { ChromeStorage, ChromeLocalStorage, ChromeSyncStorage } from './types';

async function getStorageData(): Promise<ChromeStorage> {
  const localData: ChromeLocalStorage = await chrome.storage.local.get();

  const syncData: ChromeSyncStorage = await chrome.storage.sync.get();

  return Object.assign(syncData, localData);
}

async function paint() {
  try {
    const data = await getStorageData();

    if (data.nextImage) {
      const app = $('js-app');
      if (app) {
        render(ui(data), app);
      }

      eventListeners();
    }
  } catch (err) {
    // eslint-disable-next-line
    console.error(err);
  }
}

paint();
