/*
 * This component represents the OneDrive button used to sync the current image
 * to OneDrive
 */

const onedriveButton = photo => `
      <button
        data-imageid="${photo.id}"
        id="onedrive-button"
        class="control-button cloud-button onedrive-button"
        title="Save photo to OneDrive">

        <svg class="icon icon-cloud"><use href="#icon-onedrive"></use></svg>
      </button>
`;

export default onedriveButton;
