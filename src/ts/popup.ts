import { render } from 'lit-html';
import settingsDialog from './settings/index';
import type { Settings } from './settings/types';
import '../../node_modules/chrome-extension-async/chrome-extension-async';

async function retriveSettings() {
  try {
    const localData = await chrome.storage.local.get([
      'nextImage',
      'pausedImage',
      'cloudService',
      'dropbox',
      'onedrive',
      'forecast',
      'photoFrequency',
    ]);

    const syncData = await chrome.storage.sync.get();

    const data = Object.assign(syncData, localData);
    const r: Settings = {
      cloudService: data.cloudService,
      imageSource: data.imageSource,
      coords: data.coords,
      temperatureFormat: data.temperatureFormat,
      photoFrequency: data.photoFrequency,
      collections: data.collections,
    };

    const body = document.querySelector('.js-body');
    render(settingsDialog(r), body);
  } catch (err) {
    console.log(err);
  }
}

retriveSettings();
