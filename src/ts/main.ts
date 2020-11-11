import { html, render } from 'lit-html';
import 'chrome-extension-async';
import { $, convertTimeStamp } from '../js/libs/helpers';
import eventListeners from '../js/libs/event-listeners';
import cloudButton from '../js/libs/cloud-button';
import main from '../js/components/main';
import loader from '../js/components/loader';
import { footer } from '../js/components/footer';
import header from '../js/components/header';
import svgDefs from '../js/components/svg';
import photoCard from '../js/components/photo-card';
import { ChromeStorage, ChromeLocalStorage, ChromeSyncStorage } from './types';

const app = $('app');

async function getStorageData(): Promise<ChromeStorage> {
  const localData: ChromeLocalStorage = await chrome.storage.local.get();

  const syncData: ChromeSyncStorage = await chrome.storage.sync.get();

  return Object.assign(syncData, localData);
}

async function paint() {
  try {
    const data = await getStorageData();

    if (data.nextImage) {
      const { fullDate } = convertTimeStamp(
        Math.floor(new Date(`${data.nextImage.created_at}`).getTime() / 1000)
      );

      const body = html`
        ${loader()} ${header()} ${main()} ${footer(data, fullDate)} ${svgDefs()}
      `;

      if (app) {
        render(body, app);
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
