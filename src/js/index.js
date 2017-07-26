import alertify from 'alertifyjs';
import { convertTimeStamp, togglePopover } from './components/helpers';
import saveToDropbox from './components/dropbox';
import { openSearch, closeSearch, searchPhotos } from './components/search';
import { toggleHistory, displayHistory } from './components/history';
import { handleClick, handleSubmit } from './components/handle';
import state from './components/state';
import { cloudStatus, tempUnit, updateCoords } from './components/options';

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
  linkToPhoto.setAttribute('href', `${nextImage.links.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit`);

  const photographerInfo = document.querySelector('.photographer-info');
  photographerInfo.setAttribute('href', `${nextImage.user.links.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit`);

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
  temperatureText.innerHTML = `${Math.round(weatherData.main.temp)}° - ${weatherData.weather[0].description}`;
}

const history = JSON.parse(localStorage.getItem('s-history'));
if (history) {
  displayHistory(history);
}

const dropboxButton = document.querySelector('.dropbox-button');
dropboxButton.addEventListener('click', () => {
  const imageId = dropboxButton.dataset.imageid;
  const downloadUrl = dropboxButton.dataset.downloadurl;

  saveToDropbox(imageId, downloadUrl);
});

const infoPopover = document.querySelector('.info-popover');
infoPopover.addEventListener('click', () => {
  togglePopover('.info-popover');
});

const loadMore = document.querySelector('.moreResults-button');
loadMore.addEventListener('click', () => searchPhotos(state.searchKey, state.page));

const searchButtonOpen = document.getElementById('searchButton-open');
searchButtonOpen.addEventListener('click', openSearch);

const searchButtonClose = document.getElementById('searchButton-close');
searchButtonClose.addEventListener('click', closeSearch);

document.addEventListener('keyup', (e) => {
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
document.getElementById('s-history').addEventListener('click', handleClick);
document.getElementById('historyButton').addEventListener('click', toggleHistory);

// Options

const optionsButton = document.querySelector('.options-button');
optionsButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({ command: 'update-weather' });
  togglePopover('.options-popover');
});

const selectCloud = document.querySelector('.chooseCloudStorage');

selectCloud.addEventListener('change', () => {
  cloudStatus(selectCloud);
});

cloudStatus(selectCloud);

const selectTempUnit = document.querySelector('.chooseTempUnit');


selectTempUnit.addEventListener('change', () => {
  tempUnit(selectTempUnit);
});

if (!localStorage.getItem('s-tempUnit')) {
  tempUnit(selectTempUnit);
} else {
  const unit = localStorage.getItem('s-tempUnit');
  selectTempUnit.value = unit;
}

const longitudeInput = document.querySelector('.longitude');
const latitudeInput = document.querySelector('.latitude');
const coords = localStorage.getItem('s-coords');
if (coords) {
  const longitude = JSON.parse(coords).longitude;
  const latitude = JSON.parse(coords).latitude;
  longitudeInput.value = longitude;
  latitudeInput.value = latitude;
}

longitudeInput.addEventListener('change', () => {
  const longitude = longitudeInput.value;
  if (typeof Number(longitude) === 'number' && longitude <= 180 && longitude >= -180) {
    updateCoords(longitudeInput, latitudeInput);
  }
});

latitudeInput.addEventListener('change', () => {
  const latitude = latitudeInput.value;
  if (typeof Number(latitude) === 'number' && latitude <= 90 && latitude >= -90) {
    updateCoords(longitudeInput, latitudeInput);
  }
});

chrome.runtime.onMessage.addListener((request) => {
  switch (request.command) {
    case 'update-cloud-status': {
      cloudStatus(selectCloud);
      break;
    }
  }
});
