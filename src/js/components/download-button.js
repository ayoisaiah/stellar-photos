/*
 * This component represents the download icon used to download the currently
 * displaying image
 */

const downloadButton = nextImage => `
      <button data-imageid=${
        nextImage.id
      } class="js-track-click control-button download-button"
      data-track="click-download"
      title="Download photo">
        <svg class="icon icon-download"><use href="#icon-download"></use></svg>
      </button>
`;

export default downloadButton;
