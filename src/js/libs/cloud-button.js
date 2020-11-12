import { html } from 'lit-html';

function onedriveButton(photo) {
  return html`
    <button
      data-imageid="${photo.id}"
      id="onedrive-button"
      class="control-button cloud-button onedrive-button"
      title="Save photo to OneDrive"
    >
      <svg class="icon icon-cloud"><use href="#icon-onedrive"></use></svg>
    </button>
  `;
}

function dropboxButton(photo) {
  return html`
    <button
      id="dropbox-button"
      data-imageid="${photo.id}"
      class="control-button cloud-button dropbox-button"
      title="Save photo to Dropbox"
    >
      <svg class="icon icon-cloud"><use href="#icon-dropbox"></use></svg>
    </button>
  `;
}

function cloudButton(photo) {
  const { cloudService } = window;

  if (cloudService === 'dropbox') {
    return dropboxButton(photo);
  }

  if (cloudService === 'onedrive') {
    return onedriveButton(photo);
  }

  return '';
}

export { cloudButton };
