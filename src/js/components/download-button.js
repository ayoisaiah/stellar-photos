/*
 * This component represents the download icon used to download the currently
 * displaying image
 */

const downloadButton = nextImage => `
      <button data-imageid=${
        nextImage.id
      } class="control-button download-button"
      title="Download photo">
        <svg class="icon icon-download"><use href="#icon-download"></use></svg>
      </button>
`;

export default downloadButton;
