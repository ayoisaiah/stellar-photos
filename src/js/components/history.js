import purify from './purify-dom';

const toggleHistory = () => {
  document.getElementById('s-history').classList.toggle('open');
  document.getElementById('s-footer').classList.toggle('history-open');
  document.getElementById('historyButton').classList.toggle('transform');
};

const displayHistory = (history) => {
  const historyMenu = document.getElementById('s-history');
  historyMenu.classList.remove('hidden');

  history.map((photo) => {
    const backgroundImg = photo.base64;
    const largeSrc = photo.urls.regular;
    const imageId = photo.id;
    const linkToPhoto = photo.links.html;
    const downloadUrl = photo.links.download;
    const user = `${photo.user.links.html}`;
    const userDp = `${photo.user.profile_image.small}`;

    historyMenu.insertAdjacentHTML('beforeend',
      purify.sanitize(`<li class="s-photo" id="photo-${imageId}" data-largesrc="${largeSrc}" style="background: url(${backgroundImg}) rgb(239, 239, 239) top center no-repeat; background-size: cover;">
       <div class="s-photo-actions">
          <div class="top">
            <a href="${linkToPhoto}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit" target="_blank" rel="noreferrer" title="View photo on Unsplash"><svg style="fill: #fafafa;" class="icon icon--anchor"><use xlink:href="#icon-anchor"></use></a>
          </div>
          <div class="bottom">
            <a class="user" href="${user}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit" target="_blank" rel="noreferrer">
              <img class="user-dp" src="${userDp}" />
            </a>
            <div>
              <a href="${downloadUrl}?force=true" target="_blank" rel="noreferrer" download title="Download Photo"><svg style="fill: #fafafa;" class="icon icon--download"><use xlink:href="#icon-download"></use></svg></a>
              <svg style="fill: #fafafa;" data-imageid="${imageId}" data-downloadurl="${downloadUrl}" class="icon icon--cloud" title="Save to Dropbox"><use xlink:href="#icon-cloud" data-imageid="${imageId}" data-downloadurl="${downloadUrl}" class="icon icon--cloud"></use></svg>
            </div>
          </div>
        </div>
      </li>`, { ADD_TAGS: ['use'] },
      ));
  });
};

export { toggleHistory, displayHistory };
