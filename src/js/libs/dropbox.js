import loadingIndicator from '../libs/loading-indicator';

const authorizeDropbox = () => {
  const key = 'gscbxcjhou1jx21';
  chrome.tabs.create({ url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellarapp.photos/` });
};

const saveToDropbox = (imageId, downloadUrl) => {
  chrome.storage.local.get('dropboxToken', (result) => {
    const { dropboxToken } = result;

    if (!dropboxToken) {
      // TODO: Find a way to save image to dropbox if authorizing succeeds
      authorizeDropbox();
      return;
    }


    loadingIndicator().start();

    fetch(`https://stellar-photos.herokuapp.com/api/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${dropboxToken}`)
      .then(response => response.json())
      .then((json) => {
        loadingIndicator().stop();

        if (json.error) {
          chrome.notifications.create(`notify-dropbox-${imageId}`, {
            type: 'basic',
            iconUrl: chrome.extension.getURL('icons/48.png'),
            title: 'Unable to save photo to Dropbox',
            message: 'Having problems? Please try again.',
          });

          return;
        }

        chrome.notifications.create(`notify-dropbox-${imageId}`, {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: '1 file uploaded',
          message: `photo-${imageId} was saved successfully to Dropbox`,
        });
      })
      .catch(() => {
        const message = (navigator.onLine) ? 'Unable to upload photo due to a server error' : 'There is no internet connection';

        loadingIndicator().stop();

        chrome.notifications.create(`notify-dropbox-${imageId}`, {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: 'We can\'t connect to Dropbox',
          message,
        });
      });
  });
};

export { authorizeDropbox, saveToDropbox };
