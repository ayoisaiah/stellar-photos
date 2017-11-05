const urlParams = new URLSearchParams(window.location.hash);
const accessToken = urlParams.get('#access_token');
if (accessToken) {
  chrome.storage.local.set({ dropboxToken: accessToken }, () => {
    chrome.notifications.create('dropbox-notification', {
      type: 'basic',
      iconUrl: chrome.extension.getURL('icons/48.png'),
      title: 'Dropbox authentication was successful',
      message: 'You can now save photos to your Dropbox!',
    });

    chrome.runtime.sendMessage({ command: 'update-cloud-status' });

    chrome.runtime.sendMessage({ command: 'close-tab' });
  });
}
