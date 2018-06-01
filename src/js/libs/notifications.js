import loadingIndicator from './loading-indicator';

const notifyCloudAuthenticationSuccessful = cloudService => {
  chrome.notifications.create(`${cloudService}-notification`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: `${cloudService} authentication was successful`,
    message: `You can now save photos to your ${cloudService}!`,
  });
};

const notifyCloudConnectionFailed = cloudService => {
  chrome.notifications.create(`${cloudService}-notification`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: `Failed to connect to ${cloudService}`,
    message: 'Having problems? Please try again',
  });
};

const notifySaveToCloudSuccessful = (cloudService, imageId) => {
  chrome.notifications.create(`notify-${cloudService}-${imageId}`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: '1 file uploaded',
    message: `photo-${imageId} was saved successfully to ${cloudService}`,
  });
};

const notifyUnableToUpload = (cloudService, imageId) => {
  const message = navigator.onLine
    ? 'Unable to upload photo due to a server error'
    : 'There is no internet connection';

  loadingIndicator().stop();

  chrome.notifications.create(`notify-${cloudService}-${imageId}`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: `We can't connect to ${cloudService}`,
    message,
  });
};

export {
  notifyCloudAuthenticationSuccessful,
  notifyCloudConnectionFailed,
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
};
