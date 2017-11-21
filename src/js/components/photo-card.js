/*
 * This component represents each photo displayed in the
 * search results and history menu
 */

const photoCard = (photo) => {
  // Base64 for history pane because this is stored in the browser storage
  const backgroundPhoto = photo.base64 || photo.urls.small;
  const width = photo.width;
  const height = photo.height;
  const photoId = photo.id;
  const linkToPhoto = photo.links.html;
  const downloadLink = photo.links.download;
  const photographer = `${photo.user.links.html}`;
  const photographerPicture = `${photo.user.profile_image.small}`;
  const photographerName = `${photo.user.first_name || ''}
    ${photo.user.last_name || ''}`;

  return `
      <li class="s-photo" id="photo-${photoId}"
      style="background: url(${backgroundPhoto}) rgb(239, 239, 239)
      top center no-repeat; background-size: cover;">
       <div class="s-photo-actions">
          <div class="top">
            <a class="user"
            href="${photographer}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
            target="_blank"
            rel="noreferrer">
              <img class="user-dp" src="${photographerPicture}" />
              <span class="username">${photographerName}</span>
            </a>

            <a
            href="${linkToPhoto}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
            target="_blank"
            title="View photo on Unsplash" rel="noreferrer">
              <svg style="fill: #fafafa;" class="icon icon--anchor">
                <use xlink:href="#icon-anchor"></use>
              </svg>
            </a>
          </div>

          <div class="bottom">
            <span class="s-photo-dimension">${width} x ${height}</span>

            <div>
              <a href="${downloadLink}?force=true"
              target="_blank" rel="noreferrer" download title="Download Photo">
                <svg style="fill: #fafafa;" class="icon icon--download">
                  <use xlink:href="#icon-download"></use>
                </svg>
              </a>

              <svg style="fill: #fafafa;" data-imageid="${photoId}"
              data-downloadurl="${downloadLink}" class="icon icon--cloud"
              title="Save to Dropbox">
                <use xlink:href="#icon-dropbox" data-imageid="${photoId}"
                data-downloadurl="${downloadLink}" class="icon icon--cloud">
                </use>
              </svg>
            </div>

          </div>
        </div>
      </li>`;
};

export default photoCard;
