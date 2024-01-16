import {
  validateResponse,
  lessThanTimeAgo,
  getFromChromeLocalStorage,
} from './helpers';
import {
  saveToDropboxApi,
  getDropboxKey,
  trackDownload,
  getOnedriveId,
  refreshOnedriveTokenApi,
  saveToOneDriveApi,
} from './requests';
import { ChromeLocalStorage, OAuth2 } from './types';

async function openDropboxAuthPage(): Promise<void> {
  const response = await getDropboxKey();
  const data: { dropbox_key: string } = await response.json();
  const key = data.dropbox_key;
  chrome.tabs.create({
    url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellar.freshman.tech`,
  });
}

async function saveToDropbox(imageId: string, url: string): Promise<void> {
  const localData = await getFromChromeLocalStorage('dropbox');
  const dropboxToken = localData.dropbox;

  if (!dropboxToken) {
    await openDropboxAuthPage();
    return;
  }

  await saveToDropboxApi(imageId, dropboxToken, url);
}

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

  chrome.runtime.sendMessage({
    command: 'set-onedrive-alarm',
    expires_in: onedriveAuth.expires_in,
  });

  chrome.runtime.sendMessage({ command: 'update-cloud-status' });
}

async function refreshOnedriveToken(): Promise<
  ChromeLocalStorage['onedrive'] | void
> {
  const localData = await getFromChromeLocalStorage('onedrive');
  const onedriveAuth = localData.onedrive;

  if (onedriveAuth && onedriveAuth.refresh_token) {
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
    const response = await getOnedriveId();
    const json: OnedriveID = await response.json();
    const { id } = json;

    chrome.tabs.create({
      url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${id}&scope=Files.ReadWrite.AppFolder offline_access&response_type=code&redirect_uri=https://stellar.freshman.tech`,
    });
  } catch (err) {
    console.error(err);
  } finally {
  }
}

async function saveToOneDrive(imageId: string, url: string): Promise<void> {
  const localData = await getFromChromeLocalStorage(null);
  if (!localData.onedrive) {
    await openOnedriveAuthPage();
    return;
  }

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

  await saveToOneDriveApi(imageId, localData.onedrive.access_token, url);
}

export {
  openOnedriveAuthPage,
  saveToOneDrive,
  createAppFolder,
  refreshOnedriveToken,
  saveToDropbox,
};
