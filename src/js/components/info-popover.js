/*
 * This component shows EXIF info about the current image
 */

const infoPopover = (nextImage, fullDate) => `
  <div class="popover info-popover">
    <button title="Photo info" class="control-button info-button">
      <svg class="icon icon-info"><use href="#icon-info"></use></svg>
    </button>

    <ul class="popover-content">

      <li class="photo-info-item">
        <a href="${nextImage.user.links.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
        class="photographer-info">
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
        <span class="popover-label">Created On</span>
        <span class="created-date">${fullDate}</span>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Views</span>
        <div class="wrapper">
          <span class="views">${Number(nextImage.views)
    .toLocaleString()}</span>
          <svg class="icon eye-icon"><use href="#icon-eye"></use></svg>
        </div>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Likes</span>
        <div class="wrapper">
          <span class="likes">${nextImage.likes}</span>
          <svg class="icon heart-icon"><use href="#icon-heart"></use></svg>
        </div>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Downloads</span>
        <div class="wrapper">
          <span class="downloads">${Number(nextImage.downloads)
    .toLocaleString()}</span>
          <svg class="icon download-icon">
            <use href="#icon-download"></use>
          </svg>
        </div>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Camera Model</span>
        <div class="wrapper">
          <span class="camera-model">${nextImage.exif.model ?
    nextImage.exif.model : '--'}</span>
          ${nextImage.exif.model ? `
            <svg class="icon camera-icon">
              <use href="#icon-camera"></use>
            </svg>
            ` : ''}
        </div>
      </li>

      <li class="photo-info-item">
        <span class="popover-label">Camera Make</span>
        <span class="camera-make">${nextImage.exif.make ?
    nextImage.exif.make : '--'}</span>
      </li>

      <li class="photo-info-item">
        <a href="${nextImage.links.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
        class="button linkToPhoto"
        >View photo on Unsplash.com</a>
      </li>


    </ul>
  </div>
`;

export default infoPopover;
