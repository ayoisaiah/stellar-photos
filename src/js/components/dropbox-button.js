/*
 * This component represents the Dropbox button used to sync the current image
 * to Dropbox
 */

const dropboxButton = photo => `
      <button
        data-imageid="${photo.id}"
        data-downloadurl="${photo.links.download}"
        id="dropbox-button"
        class="control-button cloud-button dropbox-button"
        title="Save photo to Dropbox">

        <svg class="icon icon-cloud"><use href="#icon-dropbox"></use></svg>
      </button>
`;

export default dropboxButton;
