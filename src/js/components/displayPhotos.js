import state from './state';
import observer from './observer';
import purify from './purify-dom';

const displayPhotos = (photos, total) => {
  photos.map((photo) => {
    const backgroundImg = photo.urls.small;
    const largeSrc = photo.urls.regular;
    const width = photo.width;
    const height = photo.height;
    const imageId = photo.id;
    const linkToPhoto = photo.links.html;
    const downloadUrl = photo.links.download;
    const user = `${photo.user.links.html}`;
    const userDp = `${photo.user.profile_image.small}`;
    const username = `${photo.user.first_name || ''} ${photo.user.last_name || ''}`;
    const searchResults = document.querySelector('.searchResults');

    searchResults.insertAdjacentHTML('beforeend',
      purify.sanitize(`<li class="s-photo" id="photo-${imageId}" data-largesrc="${largeSrc}" style="background: url(${backgroundImg}) rgb(239, 239, 239) top center no-repeat; background-size: cover;">
       <div class="s-photo-actions">
          <div class="top">
            <a class="user" href="${user}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit" target="_blank" rel="noreferrer">
              <img class="user-dp" src="${userDp}" />
              <span class="username">${username}</span>
            </a>
            <a href="${linkToPhoto}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit" target="_blank" title="View photo on Unsplash" rel="noreferrer"><svg style="fill: #fafafa;" class="icon icon--anchor"><use xlink:href="#icon-anchor"></use></a>
          </div>
          <div class="bottom">
            <span class="s-photo-dimension">${width} x ${height}</span>
            <div><a href="${downloadUrl}?force=true" target="_blank" target="_blank" rel="noreferrer" download title="Download Photo"><svg style="fill: #fafafa;" class="icon icon--download"><use xlink:href="#icon-download"></use></svg></a>
            <svg style="fill: #fafafa;" data-imageid="${imageId}" data-downloadurl="${downloadUrl}" class="icon icon--cloud" title="Save to Dropbox"><use xlink:href="#icon-cloud" data-imageid="${imageId}" data-downloadurl="${downloadUrl}" class="icon icon--cloud"></use></svg></div>
          </div>
        </div>
      </li>`, { ADD_TAGS: ['use'] },
      ));
  });

  const loadMore = document.querySelector('.moreResults-button');

  if (state.results.length >= total) {
    loadMore.classList.add('hidden');
    observer.disconnect();
    return;
  }

  state.page += 1;
  loadMore.classList.remove('hidden');
};

export default displayPhotos;
