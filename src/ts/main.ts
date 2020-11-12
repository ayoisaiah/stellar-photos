import { html, render } from 'lit-html';
import 'chrome-extension-async';
import { $ } from '../js/libs/helpers';
import eventListeners from '../js/libs/event-listeners';
import { cloudButton } from '../js/libs/cloud-button';
import { ui } from './ui';
import photoCard from '../js/components/photo-card';
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
        const historyPane = $('s-history');

        if (historyPane && data.history) {
          const h = html`
            ${data.history.map((photo) => photoCard(photo, cloudButton))}
          `;
          render(h, historyPane);
        }
      }

      eventListeners();
    }
  } catch (err) {
    // eslint-disable-next-line
    console.error(err);
  }
}

paint();
