/*
 * This component shows EXIF info about the current image
 */

const infoPopover = (nextImage, fullDate) => `
  <div class="popover info-popover">
    <button title="Photo info" data-track="click-info"
    data-label="Toggle Info Popover"
    class="control-button info-button js-track-click js-info-button">
      <svg class="icon icon-info"><use href="#icon-info"></use></svg>
    </button>

    <ul class="popover-content">

      <li class="photo-info-item">
        <a href="${
          nextImage.user.links.html
        }?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
        data-track="click-user"
        target="_blank"
        rel="noopener"
        class="photographer-info js-track-click">
          <img src="${nextImage.user.profile_image.small}"
            class="photographer-dp" />
          <span class="photographer-name">
            ${nextImage.user.first_name || ''} ${nextImage.user.last_name || ''}
          </span>
        </a>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Resolution</span>
        <span class="resolution">${nextImage.width} x ${nextImage.height}</span>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Published On</span>
        <span class="created-date">${fullDate}</span>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Camera Model</span>
        <div class="wrapper">
          <span class="camera-model">${
            nextImage.exif.model ? nextImage.exif.model : '--'
          }</span>
        </div>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Camera Make</span>
        <span class="camera-make">${
          nextImage.exif.make ? nextImage.exif.make : '--'
        }</span>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Shutter Speed</span>
        <span class="created-date">${
          nextImage.exif.exposure_time
            ? `${nextImage.exif.exposure_time}s`
            : '--'
        }</span>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Aperture</span>
        <span class="created-date">${
          nextImage.exif.aperture ? `ƒ/${nextImage.exif.aperture}` : '--'
        }</span>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Focal Length</span>
        <span class="created-date">${
          nextImage.exif.focal_length
            ? `${nextImage.exif.focal_length}mm`
            : '--'
        }</span>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">ISO</span>
        <span class="created-date">${
          nextImage.exif.iso ? nextImage.exif.iso : '--'
        }</span>
      </li>

      <li class="photo-info-item">
        <a href="${
          nextImage.links.html
        }?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-cred"
        data-track="view-unsplash-info"
        data-imageid="${nextImage.id}"
        aria-label="View photo on Unsplash.com"
        target="_blank"
        rel="noopener"
        class="button linkToPhoto js-track-click"
        >View photo on Unsplash.com</a>
      </li>

    </ul>
  </div>
`;

export default infoPopover;
