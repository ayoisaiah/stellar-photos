import 'chrome-extension-async';
import getWeatherInfo from '../js/libs/get-weather-info';
import fetchRandomPhoto from '../js/libs/fetch-random-photo';
import loadNewData from '../js/libs/load-new-data';
import { notifyCloudAuthenticationSuccessful } from '../js/libs/notifications';
import { onedriveAuth, refreshOnedriveToken } from '../js/libs/onedrive-auth';
import { ChromeSyncStorage } from './types';

async function setDefaultExtensionSettings(): Promise<void> {
  const syncSettings: ChromeSyncStorage = {
    photoFrequency: 'newtab',
    imageSource: 'official',
    temperatureFormat: 'metric',
  };

  chrome.storage.sync.set(syncSettings);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    setDefaultExtensionSettings();
  }

  if (details.reason === 'update') {
    chrome.storage.sync.get((r) => {
      const { photoFrequency, tempUnit } = r;
      const unit = tempUnit === 'fahrenheit' ? 'imperial' : 'metric';
      chrome.storage.local.get((d) => {
        const { cloudService } = d;

        chrome.storage.local.set({
          photoFrequency: photoFrequency || 'newtab',
          pausedImage: null,
          cloudService: cloudService || 'dropbox',
        });

        chrome.storage.sync.set({
          imageSource: 'custom',
          temperatureFormat: unit,
        });
      });
    });
  }

  fetchRandomPhoto();
});

type Commands =
  | 'close-tab'
  | 'set-dropbox-token'
  | 'code-flow'
  | 'update-weather'
  | 'set-onedrive-alarm';

interface Request {
  command: Commands;
  token: string;
  code: string;
  expires_in: number;
}

chrome.runtime.onMessage.addListener((request: Request, sender) => {
  const listeners = {
    'close-tab': () => {
      if (sender.tab && sender.tab.id) {
        chrome.tabs.remove([sender.tab.id]);
      }
    },

    'set-dropbox-token': () => {
      chrome.storage.local.set({ dropbox: request.token });
      notifyCloudAuthenticationSuccessful('Dropbox');
      chrome.runtime.sendMessage({ command: 'update-cloud-status' });
    },

    'code-flow': () => {
      chrome.storage.local.get('cloudService', (result) => {
        const { cloudService } = result;
        if (cloudService === 'onedrive') {
          if (sender.tab && sender.tab.id) {
            chrome.tabs.remove([sender.tab.id]);
          }
          onedriveAuth(request.code);
        }
      });
    },

    'update-weather': () => getWeatherInfo(),

    'set-onedrive-alarm': () => {
      chrome.alarms.create('refresh-onedrive-token', {
        periodInMinutes: request.expires_in / 60,
      });
    },

    'load-data': () => loadNewData(),
  };

  listeners[request.command]();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case 'loadphoto':
      fetchRandomPhoto();
      break;
    case 'loadweather':
      getWeatherInfo();
      break;
    case 'refresh-onedrive-token':
      refreshOnedriveToken();
      break;
  }
});
