/*
 * This component represents the Dropbox button used to sync the current image
 * to Dropbox
 */

const dropboxButton = nextImage => `
      <button 
        data-imageid="${nextImage.id}" 
        data-downloadurl="${nextImage.links.download}" 
        id="dropbox-button"
        class="control-button dropbox-button" 
        title="Save photo to Dropbox">

        <svg class="icon icon-cloud"><use href="#icon-dropbox"></use></svg>
      </button>
`;

export default dropboxButton;
