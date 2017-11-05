/*
 * This component shows EXIF info about the current image
 */

const infoPopover = (nextImage, fullDate) => `
  <div class="popover info-popover">
    <button class="control-button info-button">
      <svg class="icon icon-info"><use href="#icon-info"></use></svg>
    </button> 
    <ul class="popover-content">
      <li class="popover-content-item">
        <a href="${nextImage.user.links.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credi" class="photographer-info" target="_blank" rel="noreferrer">
          <img src="${nextImage.user.profile_image.small}" class="photographer-dp" />
          <span class="photographer-name">${nextImage.user.first_name || ''} ${nextImage.user.last_name || ''}</span>
        </a>
      </li>
      <li class="popover-content-item">
        <span class="label">Resolution</span>
        <span class="resolution">${nextImage.width} x ${nextImage.height}</span>
      </li>
      <li class="popover-content-item">
        <span class="label">Created On</span>
        <span class="created-date">${fullDate}</span>
      </li>
      <li class="popover-content-item">
        <span class="label">Likes</span>
        <div class="wrapper">
          <span class="likes">${nextImage.likes}</span>
          <svg class="icon heart-icon"><use href="#icon-heart"></use></svg>
        </div>
      </li>
      <li class="popover-content-item">
        <span class="label"><a href="${nextImage.links.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit" class="linkToPhoto" target="_blank" rel="noreferrer">View photo on Unsplash.com</a></span>
      </li>
    </ul>
  </div>
`;

export default infoPopover;
