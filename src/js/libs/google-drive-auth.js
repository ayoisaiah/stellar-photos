import { saveToGoogleDrive } from './googledrive';
import loadingIndicator from './loading-indicator';
import { notifyCloudAuthenticationSuccessful,
  notifyCloudConnectionFailed } from './notifications';
import { validateResponse } from './helpers';

const refreshGoogleDriveToken = (imageId, downloadUrl) => {
  chrome.storage.sync.get('googledrive_refresh_token', (result) => {
    const { googledriveRefreshToken } = result;

    fetch(`http://localhost:8080/api/googledrive/refresh?refresh_token=${googledriveRefreshToken}`)
      .then(validateResponse)
      .then((data) => {
        const googledrive = Object.assign({
          timestamp: Date.now(),
        }, data);

        localStorage.setItem('googledrive', JSON.stringify(googledrive));

        chrome.runtime.sendMessage({
          command: 'set-googledrive-alarm',
          expires_in: googledrive.expires_in,
        });

        if (imageId) {
          saveToGoogleDrive(imageId, downloadUrl);
        }
      })
      .catch((error) => {
        console.log(error);

        if (imageId) {
          loadingIndicator().stop();
          notifyCloudConnectionFailed('Google Drive');
        }
      });
  });
};

const googleDriveAuth = (code, tabId) => {
  if (code) {
    fetch(`http://localhost:8080/api/googledrive/auth?code=${code}`)
      .then(validateResponse)
      .then((data) => {
        const googledrive = Object.assign({
          timestamp: Date.now(),
        }, data);

        localStorage.setItem('googledrive', JSON.stringify(googledrive));

        if (data.refresh_token) {
          // Need to use sync storage since this refresh token is sent only once
          // and does not expire until user invalidates access
          chrome.storage.sync.set('googledrive_refresh_token', data.refresh_token);
        }

        chrome.runtime.sendMessage({
          command: 'set-googledrive-alarm',
          expires_in: googledrive.expires_in,
        });

        chrome.runtime.sendMessage({ command: 'update-cloud-status' });

        notifyCloudAuthenticationSuccessful('Google Drive');

        chrome.tabs.remove(tabId);
      })
      .catch((error) => {
        console.log(error);
        notifyCloudConnectionFailed('Google Drive');
      });
  }
};

export { googleDriveAuth, refreshGoogleDriveToken };
