import getWeatherInfo from './libs/get-weather-info';
import fetchRandomPhoto from './libs/fetch-random-photo';
import loadNewData from './libs/load-new-data';
import { notifyCloudAuthenticationSuccessful } from './libs/notifications';
import { onedriveAuth, refreshOnedriveToken } from './libs/onedrive-auth';

chrome.runtime.onInstalled.addListener(fetchRandomPhoto);
chrome.runtime.onMessage.addListener((request, sender) => {
  switch (request.command) {
    case 'close-tab': {
      chrome.tabs.remove(sender.tab.id);
      break;
    }

    case 'set-dropbox-token': {
      chrome.storage.local.set({ dropbox: request.token });

      notifyCloudAuthenticationSuccessful('Dropbox');

      chrome.runtime.sendMessage({ command: 'update-cloud-status' });
      break;
    }

    case 'code-flow': {
      chrome.storage.local.get('cloudService', result => {
        const { cloudService } = result;
        if (cloudService === 'onedrive') {
          chrome.tabs.remove(sender.tab.id);
          onedriveAuth(request.code);
        }
      });
      break;
    }

    case 'update-weather': {
      getWeatherInfo();
      break;
    }

    case 'set-onedrive-alarm': {
      chrome.alarms.create('refresh-onedrive-token', {
        periodInMinutes: request.expires_in / 60,
      });
      break;
    }

    case 'set-googledrive-alarm': {
      chrome.alarms.create('refresh-googledrive-token', {
        periodInMinutes: request.expires_in / 60,
      });
      break;
    }

    case 'load-data': {
      loadNewData();
      break;
    }

    default: {
      loadNewData();
    }
  }
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'loadphoto') {
    fetchRandomPhoto();
    return;
  }

  if (alarm.name === 'loadweather') {
    chrome.runtime.sendMessage({ command: 'update-weather' });
    return;
  }

  if (alarm.name === 'refresh-onedrive-token') {
    refreshOnedriveToken();
  }
});
