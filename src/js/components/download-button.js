/*
 * This component represents the download icon used to download the currently
 * displaying image
 */

const downloadButton = nextImage => `
      <a href="${nextImage.links.download}?force=true" class="control-button download-button" download title="Download photo">
        <svg class="icon icon-download"><use href="#icon-download"></use></svg>
      </a>
`;

export default downloadButton;
