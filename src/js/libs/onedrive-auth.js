import { saveToOneDrive } from './onedrive';
import { validateResponse } from './helpers';
import { authorizeOnedrive, refreshOnedriveTokenApi } from '../api';
import {
  notifyCloudAuthenticationSuccessful,
  notifyCloudConnectionFailed,
} from './notifications';
import loadingIndicator from './loading-indicator';

const createAppFolder = onedriveData => {
  const headers = new Headers({
    Authorization: `bearer ${onedriveData.access_token}`,
  });

  const init = {
    method: 'GET',
    headers,
  };

  const request = new Request(
    'https://graph.microsoft.com/v1.0/drive/special/approot',
    init
  );

  return fetch(request)
    .then(validateResponse)
    .then(() => {
      chrome.storage.local.set({ onedrive: onedriveData });

      notifyCloudAuthenticationSuccessful('Onedrive');

      chrome.runtime.sendMessage({
        command: 'set-onedrive-alarm',
        expires_in: onedriveData.expires_in,
      });

      chrome.runtime.sendMessage({ command: 'update-cloud-status' });
    });
};

const onedriveAuth = code => {
  if (code) {
    authorizeOnedrive(code)
      .then(data => {
        const onedriveData = Object.assign(
          {
            timestamp: Date.now(),
          },
          data
        );

        return createAppFolder(onedriveData);
      })
      .catch(() => {
        notifyCloudConnectionFailed('Onedrive');
      });
  }
};

const refreshOnedriveToken = imageId => {
  chrome.storage.local.get('onedrive', result => {
    const onedriveData = result.onedrive;

    refreshOnedriveTokenApi(onedriveData.refresh_token)
      .then(data => {
        const onedrive = Object.assign(
          {
            timestamp: Date.now(),
          },
          data
        );

        chrome.storage.local.set({ onedrive });

        chrome.runtime.sendMessage({
          command: 'set-onedrive-alarm',
          expires_in: onedriveData.expires_in,
        });

        if (imageId) {
          saveToOneDrive(imageId);
        }
      })
      .catch(() => {
        if (imageId) {
          loadingIndicator().stop();
          notifyCloudConnectionFailed('Onedrive');
        }
      });
  });
};

export { onedriveAuth, refreshOnedriveToken };
