import getWeatherInfo from './libs/get-weather-info';
import fetchRandomPhoto from './libs/fetch-random-photo';
import loadNewData from './libs/load-new-data';
import { notifyCloudAuthenticationSuccessful } from './libs/notifications';
import { onedriveAuth, refreshOnedriveToken } from './libs/onedrive-auth';

const setDefaultExtensionSettings = () => {
  chrome.storage.local.set({
    cloudService: 'dropbox',
    forecast: null,
    nextImage: null,
    history: null,
    pausedImage: null,
    photoFrequency: 'newtab',
  });

  chrome.storage.sync.set({
    collections: '',
    imageSource: 'official',
    temperatureFormat: 'metric',
    coords: {
      latitude: '',
      longitude: '',
    },
  });
};

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    setDefaultExtensionSettings();
  }

  if (details.reason === 'update') {
    chrome.storage.sync.get(r => {
      const { photoFrequency, tempUnit } = r;
      const unit = tempUnit === 'fahrenheit' ? 'imperial' : 'metric';
      chrome.storage.local.get(d => {
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

chrome.runtime.onMessage.addListener((request, sender) => {
  const listeners = {
    'close-tab': () => chrome.tabs.remove(sender.tab.id),

    'set-dropbox-token': () => {
      chrome.storage.local.set({ dropbox: request.token });
      notifyCloudAuthenticationSuccessful('Dropbox');
      chrome.runtime.sendMessage({ command: 'update-cloud-status' });
    },

    'code-flow': () => {
      chrome.storage.local.get('cloudService', result => {
        const { cloudService } = result;
        if (cloudService === 'onedrive') {
          chrome.tabs.remove(sender.tab.id);
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

chrome.alarms.onAlarm.addListener(alarm => {
  const alarms = {
    loadphoto: () => fetchRandomPhoto(),
    loadweather: () => getWeatherInfo(),
    'refresh-onedrive-token': () => refreshOnedriveToken(),
  };

  alarms[alarm.name]();
});
