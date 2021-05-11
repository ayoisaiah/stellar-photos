import {
  getRandomPhoto,
  authorizeOnedrive,
  authorizeGoogleDrive,
} from './requests';
import { UnsplashImage } from './types/unsplash';
import { getChromeStorageData, lessThanTimeAgo } from './helpers';
import {
  notifyCloudAuthenticationSuccessful,
  notifyCloudConnectionFailed,
} from './notifications';
import { refreshOnedriveToken, createAppFolder } from './onedrive';
import { ChromeSyncStorage, OAuth2 } from './types';
import { refreshGoogleDriveToken } from './googledrive';

async function fetchRandomPhoto(): Promise<void> {
  try {
    const storageData = await getChromeStorageData();
    const { imageSource } = storageData;
    let { imageResolution } = storageData;
    let collections = '998309';

    if (imageSource === 'custom') {
      collections = storageData.collections || collections;
    }

    if (!imageResolution) {
      imageResolution = 'standard';
    }

    const response = await getRandomPhoto(collections, imageResolution);
    const data = await response.json();

    UnsplashImage.check(data);

    const nextImage = {
      timestamp: Date.now(),
      ...data,
    };

    chrome.storage.local.set({ nextImage });

    const history = storageData.history || [];

    if (history.length >= 10) {
      history.pop();
    }

    history.unshift(nextImage);

    chrome.storage.local.set({ history });

    chrome.runtime.sendMessage({ command: 'update-history' });
  } catch (err) {
    console.error(err);
  }
}

async function refresh(): Promise<void> {
  try {
    const data = await getChromeStorageData();

    const { nextImage, photoFrequency } = data;

    if (nextImage) {
      switch (photoFrequency) {
        case 'paused':
          break;
        case 'newtab':
          fetchRandomPhoto();
          break;
        case 'every15minutes':
          if (!lessThanTimeAgo(nextImage.timestamp, 900)) {
            fetchRandomPhoto();
          }
          break;
        case 'everyhour':
          if (!lessThanTimeAgo(nextImage.timestamp, 3600)) {
            fetchRandomPhoto();
          }
          break;
        case 'everyday':
          if (!lessThanTimeAgo(nextImage.timestamp, 86400)) {
            fetchRandomPhoto();
          }
          break;
        default:
          fetchRandomPhoto();
      }
    } else {
      fetchRandomPhoto();
    }
  } catch (err) {
    console.error(err);
  }
}

async function setDefaultExtensionSettings(): Promise<void> {
  const syncSettings: ChromeSyncStorage = {
    photoFrequency: 'newtab',
    imageResolution: 'standard',
    imageSource: 'official',
    temperatureFormat: 'metric',
  };

  chrome.storage.sync.set(syncSettings);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    setDefaultExtensionSettings();
  }

  fetchRandomPhoto();
});

type Commands =
  | 'close-tab'
  | 'set-dropbox-token'
  | 'code-flow'
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
      chrome.storage.local.get('cloudService', async (result) => {
        if (sender.tab && sender.tab.id) {
          chrome.tabs.remove([sender.tab.id]);
        }

        const { cloudService } = result;
        if (cloudService === 'googledrive') {
          try {
            const response = await authorizeGoogleDrive(request.code);
            const data: OAuth2 = await response.json();

            OAuth2.check(data);

            if (data.refresh_token) {
              chrome.storage.sync.set({
                googleDriveRefreshToken: data.refresh_token,
              });

              delete data.refresh_token;
            }

            if (data.access_token) {
              const googleDriveData = {
                timestamp: Date.now(),
                ...data,
              };

              chrome.storage.local.set({ googledrive: googleDriveData });
              notifyCloudAuthenticationSuccessful('Google Drive');

              chrome.runtime.sendMessage({
                command: 'set-googledrive-alarm',
                expires_in: data.expires_in,
              });
            }
          } catch (err) {
            notifyCloudConnectionFailed('Google Drive');
          }
        }

        if (cloudService === 'onedrive') {
          try {
            const response = await authorizeOnedrive(request.code);
            const data: OAuth2 = await response.json();

            OAuth2.check(data);

            if (data.access_token) {
              const onedriveData = {
                timestamp: Date.now(),
                ...data,
              };

              await createAppFolder(onedriveData);
            }
          } catch (err) {
            notifyCloudConnectionFailed('Onedrive');
          }
        }
      });
    },

    'set-onedrive-alarm': () => {
      chrome.alarms.create('refresh-onedrive-token', {
        periodInMinutes: Number(request.expires_in / 60),
      });
    },

    'set-googledrive-alarm': () => {
      chrome.alarms.create('refresh-googledrive-token', {
        periodInMinutes: Number(request.expires_in / 60),
      });
    },

    refresh: () => refresh(),
  };

  listeners[request.command]();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    switch (alarm.name) {
      case 'loadphoto':
        await fetchRandomPhoto();
        break;
      case 'refresh-onedrive-token':
        await refreshOnedriveToken();
        break;
      case 'refresh-googledrive-token':
        await refreshGoogleDriveToken();
        break;
    }
  } catch (err) {
    console.error(err);
  }
});
