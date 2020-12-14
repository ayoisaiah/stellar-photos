import { loadingIndicator } from './ui/loading';
import { validateResponse, lessThanTimeAgo } from './helpers';
import {
  notifyUnableToUpload,
  notifyCloudConnectionFailed,
  notifyCloudAuthenticationSuccessful,
} from '../js/libs/notifications';
import {
  trackDownload,
  getOnedriveId,
  refreshOnedriveTokenApi,
} from './requests';
import { OnedriveAuth } from './types';

let interval: number;

interface OnedriveID {
  id: string;
}

async function createAppFolder(onedriveAuth: OnedriveAuth): Promise<void> {
  const headers = new Headers({
    Authorization: `bearer ${onedriveAuth.access_token}`,
  });

  const init = {
    method: 'GET',
    headers,
  };

  const request = new Request(
    'https://graph.microsoft.com/v1.0/drive/special/approot',
    init
  );

  const response = await fetch(request);
  validateResponse(response);

  chrome.storage.local.set({ onedrive: onedriveAuth });
  notifyCloudAuthenticationSuccessful('Onedrive');

  chrome.runtime.sendMessage({
    command: 'set-onedrive-alarm',
    expires_in: onedriveAuth.expires_in,
  });

  chrome.runtime.sendMessage({ command: 'update-cloud-status' });
}

async function refreshOnedriveToken(
  imageId?: string,
  url?: string
): Promise<void> {
  try {
    const localData = await chrome.storage.local.get('onedrive');
    const onedriveAuth = localData.onedrive;

    if (onedriveAuth) {
      const response = await refreshOnedriveTokenApi(
        onedriveAuth.refresh_token
      );
      const data = await response.json();

      const onedrive = {
        timestamp: Date.now(),
        ...data,
      };

      chrome.storage.local.set({ onedrive });

      chrome.runtime.sendMessage({
        command: 'set-onedrive-alarm',
        expires_in: onedriveAuth.expires_in,
      });

      if (imageId && url) {
        saveToOneDrive(imageId, url);
      }
    }
  } catch (err) {
    if (imageId) {
      loadingIndicator().stop();
      notifyCloudConnectionFailed('Onedrive');
    }
  }
}

async function openOnedriveAuthPage(): Promise<void> {
  try {
    loadingIndicator().start();
    const response = await getOnedriveId();
    const json: OnedriveID = await response.json();
    const { id } = json;

    chrome.tabs.create({
      url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${id}&scope=Files.ReadWrite.AppFolder offline_access&response_type=code&redirect_uri=https://ayoisaiah.github.io/stellar-photos`,
    });
  } catch (err) {
    // eslint-disable-next-line
    console.error(err);
  } finally {
    loadingIndicator().stop();
  }
}

async function monitorUploadProgress(
  url: string,
  imageId: string
): Promise<void> {
  try {
    const response = await fetch(url);
    const json: { status: string } = await validateResponse(response).json();
    if (json.status === 'completed') {
      loadingIndicator().stop();
      clearInterval(interval);

      chrome.notifications.create(`notify-onedrive-${imageId}`, {
        type: 'basic',
        iconUrl: chrome.extension.getURL('icons/48.png'),
        title: '1 file uploaded',
        message: `photo-${imageId} was saved successfully to Onedrive`,
      });
    }
  } catch (err) {
    clearInterval(interval);
    notifyUnableToUpload('Onedrive', imageId);
    loadingIndicator().stop();
  }
}

async function saveToOneDrive(imageId: string, url: string): Promise<void> {
  try {
    const localData = await chrome.storage.local.get('onedrive');

    if (!localData.onedrive) return;

    const onedriveData = localData.onedrive;

    if (!onedriveData) {
      openOnedriveAuthPage();
      return;
    }

    loadingIndicator().start();

    await trackDownload(imageId);

    if (!lessThanTimeAgo(onedriveData.timestamp, 3600)) {
      refreshOnedriveToken(imageId);
      return;
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      Prefer: 'respond-async',
      Authorization: `bearer ${onedriveData.access_token}`,
    });

    const body = {
      name: `photo-${imageId}.jpg`,
      '@microsoft.graph.sourceUrl': url,
      file: {},
    };

    const init = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    };

    const request = new Request(
      'https://graph.microsoft.com/v1.0/drive/special/approot/children',
      init
    );

    const response = await fetch(request);
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const location = response.headers.get('location');
    if (location) {
      interval = window.setInterval(
        () => monitorUploadProgress(location, imageId),
        1000
      );
    }
  } catch {
    clearInterval(interval);
    notifyUnableToUpload('Onedrive', imageId);
    loadingIndicator().stop();
  }
}

export {
  openOnedriveAuthPage,
  saveToOneDrive,
  createAppFolder,
  refreshOnedriveToken,
};
