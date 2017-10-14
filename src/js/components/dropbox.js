import { authorizeDropbox } from './options';

const saveToDropbox = (imageId, downloadUrl) => {
  chrome.storage.local.get('dropboxToken', (result) => {
    const { dropboxToken } = result;

    if (!dropboxToken) {
      authorizeDropbox(imageId, downloadUrl);
      return;
    }

    const loader = document.getElementById('loader');
    loader.classList.add('loader-active');

    fetch(`https://stellar-photos.herokuapp.com/api/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${dropboxToken}`)
      .then(response => response.json())
      .then((json) => {
        loader.classList.remove('loader-active');
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

        loader.classList.remove('loader-active');
        chrome.notifications.create(`notify-dropbox-${imageId}`, {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: 'We can\'t connect to Dropbox',
          message,
        });
      });
  });
};

export default saveToDropbox;
