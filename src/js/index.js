import alertify from 'alertifyjs';
import convertTimeStamp from './components/helpers';
import saveToDropbox from './components/dropbox';
import { openSearch, closeSearch, searchPhotos } from './components/search';
import { handleClick, handleSubmit } from './components/handle';
import state from './components/state';

alertify.defaults = {
  notifier: {
    position: 'top-right',
  },
};

const nextImage = JSON.parse(localStorage.getItem('nextImage'));
if (nextImage) {
  const body = document.querySelector('body');
  body.style.backgroundImage = `url(${nextImage.base64})`;

  const downloadButton = document.querySelector('.download-button');
  downloadButton.setAttribute('href', `${nextImage.links.download}?force=true`);
  downloadButton.setAttribute('download', '');

  const linkToPhoto = document.querySelector('.linkToPhoto');
  linkToPhoto.setAttribute('href', `${nextImage.links.html}`);

  const photographerInfo = document.querySelector('.photographer-info');
  photographerInfo.setAttribute('href', `${nextImage.user.links.html}`);

  const photographerDp = document.querySelector('.photographer-dp');
  photographerDp.setAttribute('src', `${nextImage.user.profile_image.small}`);

  const photographerName = document.querySelector('.photographer-name');
  photographerName.insertAdjacentText('beforeend', `${nextImage.user.first_name || ''} ${nextImage.user.last_name || ''}`);

  const resolution = document.querySelector('.resolution');
  resolution.insertAdjacentText('beforeend', `${nextImage.width} x ${nextImage.height}`);

  const created = document.querySelector('.created-date');
  const fullDate = convertTimeStamp(Math.floor(new Date(`${nextImage.created_at}`).getTime() / 1000)).fullDate;
  created.insertAdjacentText('beforeend', `${fullDate}`);

  const likes = document.querySelector('.likes');
  likes.insertAdjacentText('beforeend', `${nextImage.likes}`);

  const dropboxButton = document.querySelector('.dropbox-button');
  dropboxButton.setAttribute('data-imageid', `${nextImage.id}`);
  dropboxButton.setAttribute('data-downloadurl', `${nextImage.links.download}`);
}

const weatherData = JSON.parse(localStorage.getItem('s-weather'));
if (weatherData) {
  const locationText = document.querySelector('.location-text');
  const temperatureText = document.querySelector('.temperature-text');
  locationText.innerHTML = weatherData.name;
  temperatureText.innerHTML = `${(weatherData.main.temp - 273).toFixed(0)}° - ${weatherData.weather[0].description}`;
}

const dropboxButton = document.querySelector('.dropbox-button');
dropboxButton.addEventListener('click', () => {
  if (!localStorage.getItem('dropbox-token')) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const imageId = dropboxButton.dataset.imageid;
  const downloadUrl = dropboxButton.dataset.downloadurl;

  saveToDropbox(imageId, downloadUrl);
});

const popover = document.querySelector('.popover');
popover.addEventListener('click', () => {
  const popoverContent = document.querySelector('.popover-content');
  popoverContent.classList.toggle('popover-content--is-visible');
});

const loadMore = document.querySelector('.moreResults-button');
loadMore.addEventListener('click', () => searchPhotos(state.searchKey, state.page));

const searchButtonOpen = document.getElementById('searchButton-open');
searchButtonOpen.addEventListener('click', () => openSearch());

const searchButtonClose = document.getElementById('searchButton-close');
searchButtonClose.addEventListener('click', () => closeSearch());

document.addEventListener('keyup', (e) => {
  // If Esc is pressed
  if (e.keyCode === 27) {
    closeSearch();
  }
});

document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  closeSearch();
  handleSubmit();
});

document.getElementById('searchResults').addEventListener('click', handleClick);
