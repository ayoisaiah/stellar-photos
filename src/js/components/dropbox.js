import alertify from 'alertifyjs';

const saveToDropbox = (imageId, downloadUrl) => {
  const token = localStorage.getItem('dropbox-token');
  alertify.notify(`Saving photo-${imageId} to your Dropbox`, 'notify', 3, () => {});

  console.log(imageId, downloadUrl);

  fetch(`http://localhost:3000/api/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${token}`)
    .then(response => response.json())
    .then((json) => {
      console.log(json);
      if (json.error) {
        alertify.error('Oh Snap! There was a problem saving to Drobox', 3, () => {});
        return;
      }
      alertify.success(`photo-${imageId} saved successfully to Dropbox`, 3, () => {});
    })
    .catch(error => {
      console.log(error);
      alertify.error('Oh Snap! There was a problem saving to Drobox', 3, () => {});
    });
};

export default saveToDropbox;
