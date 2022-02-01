function notifyCloudAuthenticationSuccessful(cloudService: string): void {
  chrome.notifications.create(`${cloudService}-notification`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: `${cloudService} authentication was successful`,
    message: `You can now save photos to your ${cloudService}!`,
  });
}

function notifyCloudConnectionFailed(cloudService: string): void {
  chrome.notifications.create(`${cloudService}-notification`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: `Failed to connect to ${cloudService}`,
    message: 'Having problems? Please try again',
  });
}

function notifySaveToCloudSuccessful(
  cloudService: string,
  imageId: string
): void {
  chrome.notifications.create(`notify-${cloudService}-${imageId}`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: '1 file uploaded',
    message: `photo-${imageId} was saved successfully to ${cloudService}`,
  });
}

function notifyUnableToUpload(cloudService: string, imageId: string): void {
  const message = navigator.onLine
    ? 'Unable to upload photo due to a server error'
    : 'There is no internet connection';

  chrome.notifications.create(`notify-${cloudService}-${imageId}`, {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: `We can't connect to ${cloudService}`,
    message,
  });
}

function notifyNoSearchResults(): void {
  chrome.notifications.create('notify-search', {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: 'No images match your search',
    message: 'Try different or more general keywords',
  });
}

function notifySearchError(message: string) {
  chrome.notifications.create('notify-search', {
    type: 'basic',
    iconUrl: chrome.extension.getURL('icons/48.png'),
    title: 'Stellar Photos',
    message,
  });
}

export {
  notifyCloudAuthenticationSuccessful,
  notifyCloudConnectionFailed,
  notifySaveToCloudSuccessful,
  notifyUnableToUpload,
  notifyNoSearchResults,
  notifySearchError,
};
