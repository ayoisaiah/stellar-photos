import { loadingIndicator } from './ui/loading';
import {
  getGoogleDriveKey,
  refreshGoogleDriveTokenApi,
  saveToGoogleDriveApi,
} from './requests';
import { ChromeLocalStorage, ChromeSyncStorage, OAuth2 } from './types';
import {
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
} from './notifications';
import { lessThanTimeAgo } from './helpers';

async function openGoogleDriveAuthPage(): Promise<void> {
  const response = await getGoogleDriveKey();
  const data: { googledrive_key: string } = await response.json();
  const key = data.googledrive_key;
  chrome.tabs.create({
    url: `https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/drive.file&access_type=offline&response_type=code&redirect_uri=https://ayoisaiah.github.io/stellar-photos&client_id=${key}`,
  });
}

async function refreshGoogleDriveToken(): Promise<
  ChromeLocalStorage['googledrive'] | void
> {
  const localData: ChromeLocalStorage = await chrome.storage.local.get();
  const syncData: ChromeSyncStorage = await chrome.storage.sync.get();
  const googleDriveAuth = localData.googledrive;
  const { googleDriveRefreshToken } = syncData;

  if (googleDriveAuth) {
    if (!googleDriveRefreshToken) return;
    const response = await refreshGoogleDriveTokenApi(googleDriveRefreshToken);
    const data: OAuth2 = await response.json();

    OAuth2.check(data);

    const googledrive = {
      timestamp: Date.now(),
      ...data,
    };

    chrome.storage.local.set({ googledrive });
    return googledrive;
  }
}

async function saveToGoogleDrive(imageId: string, url: string): Promise<void> {
  try {
    const localData: ChromeLocalStorage = await chrome.storage.local.get();
    if (!localData.googledrive) {
      await openGoogleDriveAuthPage();
      return;
    }

    loadingIndicator().start();

    const tokenExpired = lessThanTimeAgo(
      localData.googledrive.timestamp,
      localData.googledrive.expires_in
    );
    if (!tokenExpired) {
      const data = await refreshGoogleDriveToken();
      if (data && data.access_token) {
        localData.googledrive = data;
      } else {
        openGoogleDriveAuthPage();
        return;
      }
    }

    const token = localData.googledrive.access_token;
    await saveToGoogleDriveApi(imageId, token, url);
    notifySaveToCloudSuccessful('Google Drive', imageId);
  } catch (err) {
    notifyUnableToUpload('Google Drive', imageId);
  } finally {
    loadingIndicator().stop();
  }
}

export { openGoogleDriveAuthPage, refreshGoogleDriveToken, saveToGoogleDrive };
