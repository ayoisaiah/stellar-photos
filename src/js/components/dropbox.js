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
            title: 'Oh Snap!',
            message: 'There was a problem saving to Dropbox',
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
        loader.classList.remove('loader-active');
        chrome.notifications.create(`notify-dropbox-${imageId}`, {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: 'Oh Snap!',
          message: 'There was a problem saving to Dropbox',
        });
      });
  });
};

export default saveToDropbox;
