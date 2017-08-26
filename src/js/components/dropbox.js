import { error, dismissAll, success, notify } from 'alertifyjs';
import { authorizeDropbox } from './options';

const saveToDropbox = (imageId, downloadUrl) => {
  chrome.storage.local.get('dropboxToken', (result) => {
    const { dropboxToken } = result;

    if (!dropboxToken) {
      authorizeDropbox(imageId, downloadUrl);
      return;
    }

    notify(`Saving photo-${imageId} to your Dropbox`, 'notify', 3);

    fetch(`https://stellar-photos.herokuapp.com/api/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${dropboxToken}`)
      .then(response => response.json())
      .then((json) => {
        dismissAll();
        if (json.error) {
          error('Oh Snap! There was a problem saving to Drobox', 3)
          return;
        }
        success(`photo-${imageId} saved successfully to Dropbox`, 3);
      })
      .catch(() => {
        dismissAll();
        error('Oh Snap! There was a problem saving to Drobox', 3);
      });
  });
};

export default saveToDropbox;
