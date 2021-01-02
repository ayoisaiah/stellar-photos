import { loadingIndicator } from './ui/loading';
import { validateResponse, lessThanTimeAgo } from './helpers';
import {
  notifyUnableToUpload,
  notifyCloudAuthenticationSuccessful,
} from './notifications';
import {
  trackDownload,
  getOnedriveId,
  refreshOnedriveTokenApi,
} from './requests';
import { ChromeLocalStorage, OAuth2 } from './types';

let interval: number;

interface OnedriveID {
  id: string;
}

async function createAppFolder(onedriveAuth: OAuth2): Promise<void> {
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

async function refreshOnedriveToken(): Promise<
  ChromeLocalStorage['onedrive'] | void
> {
  const localData = await chrome.storage.local.get('onedrive');
  const onedriveAuth = localData.onedrive;

  if (onedriveAuth) {
    const response = await refreshOnedriveTokenApi(onedriveAuth.refresh_token);
    const data: OAuth2 = await response.json();

    OAuth2.check(data);

    const onedrive = {
      timestamp: Date.now(),
      ...data,
    };

    chrome.storage.local.set({ onedrive });

    chrome.runtime.sendMessage({
      command: 'set-onedrive-alarm',
      expires_in: onedriveAuth.expires_in,
    });

    return onedrive;
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
    console.log(url);
    const response = await fetch(url);
    const json: { status: string } = await validateResponse(response).json();
    console.log(json);
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
    console.log(url);
    const localData: ChromeLocalStorage = await chrome.storage.local.get();

    if (!localData.onedrive) {
      await openOnedriveAuthPage();
      return;
    }

    loadingIndicator().start();

    const tokenExpired = lessThanTimeAgo(
      localData.onedrive.timestamp,
      localData.onedrive.expires_in
    );
    if (!tokenExpired) {
      const data = await refreshOnedriveToken();
      if (data && data.access_token) {
        localData.onedrive = data;
      } else {
        openOnedriveAuthPage();
        return;
      }
    }

    await trackDownload(imageId);

    const headers = new Headers({
      'Content-Type': 'application/json',
      Prefer: 'respond-async',
      Authorization: `Bearer ${localData.onedrive.access_token}`,
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
