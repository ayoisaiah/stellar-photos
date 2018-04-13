/*
 * This component represents the Google Drive button used to sync the current
 * image to Google Drive
 */

const googleDriveButton = photo => `
      <button
        data-imageid="${photo.id}"
        data-downloadurl="${photo.urls.small}"
        id="googledrive-button"
        class="control-button cloud-button googledrive-button"
        title="Save photo to Google Drive">

        <svg class="icon icon-cloud"><use href="#icon-google-drive"></use></svg>
      </button>
`;

export default googleDriveButton;
