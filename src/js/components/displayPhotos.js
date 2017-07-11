import state from './state';

const displayPhotos = (photos, total) => {
  photos.map((photo) => {
    const backgroundImg = photo.urls.small;
    const largeSrc = photo.urls.regular;
    const width = photo.width;
    const height = photo.height;
    const imageId = photo.id;
    const downloadUrl = photo.links.download;
    const user = `${photo.user.links.html}`;
    const userDp = `${photo.user.profile_image.small}`;
    const username = `${photo.user.first_name || ''} ${photo.user.last_name || ''}`;
    const searchResults = document.querySelector('.searchResults');

    searchResults.insertAdjacentHTML('beforeend',
      `<li class='s-photo' id='photo-${imageId}' data-largesrc='${largeSrc}' style='background: url(${backgroundImg}) rgb(239, 239, 239) top center no-repeat; background-size: cover;'>
       <div class="s-photo-actions">
          <div class='s-photo-user'>
            <a class='user' href='${user}'>
              <img class="user-dp" src='${userDp}' />
              <span class="username">${username}</span>
            </a>
          </div>
          <div class='s-photo-controls'>
            <span class='s-photo-dimension'>${width} x ${height}</span>
            <div><a href='${downloadUrl}?force=true' target='_blank' download title='Download Photo'><svg style='fill: #fafafa;' class='icon icon--download'><use xlink:href="#icon-download"></use></svg></a>
            <svg style="fill: #fafafa;" data-imageid='${imageId}' data-downloadurl='${downloadUrl}' class="icon icon--cloud"><use xlink:href="#icon-cloud" data-imageid='${imageId}' data-downloadurl='${downloadUrl}' class="icon icon--cloud"></use></svg></div>
          </div>
        </div>
      </li>`,
    );
  });

  const loadMore = document.querySelector('.moreResults-button');

  if (state.results.length >= total) {
    loadMore.classList.add('hidden');
    document.querySelector('.moreResults p').classList.remove('hidden');
    return;
  }

  state.page += 1;
  loadMore.classList.remove('hidden');
  console.log(state);
};

export default displayPhotos;
