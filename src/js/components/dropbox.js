import alertify from 'alertifyjs';

const saveToDropbox = (imageId, downloadUrl) => {
  if (!localStorage.getItem('dropbox-token')) {
    chrome.runtime.openOptionsPage();
    return;
  }
  const token = localStorage.getItem('dropbox-token');
  alertify.notify(`Saving photo-${imageId} to your Dropbox`, 'notify', 3, () => {});

  console.log(imageId, downloadUrl);

  fetch(`https://stellar-photos.herokuapp.com/api/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${token}`)
    .then(response => response.json())
    .then((json) => {
      console.log(json);
      alertify.dismissAll();
      if (json.error) {
        alertify.error('Oh Snap! There was a problem saving to Drobox', 3, () => {});
        return;
      }
      alertify.success(`photo-${imageId} saved successfully to Dropbox`, 3, () => {});
    })
    .catch(error => {
      console.log(error);
      alertify.dismissAll();
      alertify.error('Oh Snap! There was a problem saving to Drobox', 3, () => {});
    });
};

export default saveToDropbox;
