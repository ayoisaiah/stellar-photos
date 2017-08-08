import alertify from 'alertifyjs';
import { authorizeDropbox } from './options';

const saveToDropbox = (imageId, downloadUrl) => {
  if (!localStorage.getItem('dropbox-token')) {
    authorizeDropbox();
    return;
  }
  const token = localStorage.getItem('dropbox-token');
  alertify.notify(`Saving photo-${imageId} to your Dropbox`, 'notify', 3);

  fetch(`https://stellar-photos.herokuapp.com/api/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${token}`)
    .then(response => response.json())
    .then((json) => {
      alertify.dismissAll();
      if (json.error) {
        alertify.error('Oh Snap! There was a problem saving to Drobox', 3);
        return;
      }
      alertify.success(`photo-${imageId} saved successfully to Dropbox`, 3);
    })
    .catch(() => {
      alertify.dismissAll();
      alertify.error('Oh Snap! There was a problem saving to Drobox', 3);
    });
};

export default saveToDropbox;
