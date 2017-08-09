import alertify from 'alertifyjs';
import timeago from 'timeago.js';
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

  const controls = document.querySelector('.controls');
  controls.insertAdjacentHTML('beforeend', `
    <div class="popover options-popover">
      <button class="control-button options-button" title="Options">Options</button> 
      <div class="popover-content">
        <section class="saveTo">
          <span class="label">Save to cloud storage</span>
          <select class="chooseCloudStorage">
            <option value="dropbox-token" selected>Dropbox</option>
          </select>
          <span class="action"></span>
        </section>

        <form class="weather-coords">
          <span class="label">Paste your coordinates here to get current weather information.</span>
          <label class="label" for="latitude">Latitude: <br> <input type="text" name="latitude" class="latitude" value=""></label>      
          <label class="label" for="longitude">Longitude: <br> <input type="text" name="longitude" class="longitude" value=""></label>
          <button type="submit" class="update-coords">Save</button>
        </form>

        <section class="temperature-unit">
          <span class="label">Choose Temperature Unit</span>
          <select class="chooseTempUnit">
            <option value="celsius">Celsius</option>
            <option value="fahrenheit">Fahrenheit</option>
          </select>
        </section>
      </div>
    </div>

    <a href="${nextImage.links.download}?force=true" class="control-button download-button" download title="Download photo">
      Download
    </a>

    <button data-imageid="${nextImage.id}" data-downloadurl="${nextImage.links.download}" class="control-button dropbox-button" title="Save photo to Dropbox">
      Save to Dropbox
    </button>

    <div class="popover info-popover">
      <button class="control-button info-button">Info</button> 
      <ul class="popover-content"></ul>
    </div>
  `);

  const fullDate = convertTimeStamp(Math.floor(new Date(`${nextImage.created_at}`).getTime() / 1000)).fullDate;

  const infoPopoverContent = document.querySelector('.info-popover .popover-content');
  infoPopoverContent.insertAdjacentHTML('beforeend', `
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
        <svg class="icon heart-icon"><use xlink:href="#icon-heart"></use></svg>
      </div>
    </li>
    <li class="popover-content-item">
      <span class="label"><a href="${nextImage.links.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit" class="linkToPhoto" target="_blank" rel="noreferrer">View photo on Unsplash.com</a></span>
    </li>
  `);
}

const weatherData = JSON.parse(localStorage.getItem('s-weather'));
if (weatherData) {
  const weather = document.querySelector('.weather');
  weather.insertAdjacentHTML('beforeend', `
    <span class="location">
      <svg class="icon location-icon"><use xlink:href="#icon-location"></use></svg>
      <span class="location-text">${weatherData.name}</span>
    </span>
    <span class="temperature">
      <svg class="icon temperature-icon">
        <use xlink:href="#icon-temperature"></use>
      </svg>
      <span class="temperature-text">${Math.round(weatherData.main.temp)}° - ${weatherData.weather[0].description}</span>
    </span>
    <span class="last-updated">${timeago().format(new Date(weatherData.timestamp))}</span>
  `);
}

const history = JSON.parse(localStorage.getItem('s-history'));
if (history) {
  document.querySelector('.s-main').insertAdjacentHTML('afterbegin', `
    <button id="historyButton" class="historyButton historyButton-open" title="toggle history menu" aria-label="Toggle History Menu">
      <div>
        <i class="bar1"></i>
        <i class="bar2"></i>
        <i class="bar3"></i>
      </div>
    </button>
  `);
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

const weatherCoords = document.querySelector('.weather-coords');
weatherCoords.addEventListener('submit', (e) => {
  e.preventDefault();
  const longitude = document.querySelector('.longitude').value;
  const latitude = document.querySelector('.latitude').value;
  if (typeof Number(longitude) === 'number' && longitude <= 180 && longitude >= -180
    && typeof Number(latitude) === 'number' && latitude <= 90 && latitude >= -90) {
    const coords = {
      longitude,
      latitude,
    };
    updateCoords(coords);
  }
});

const longitudeInput = document.querySelector('.longitude');
const latitudeInput = document.querySelector('.latitude');
const coords = localStorage.getItem('s-coords');
if (coords) {
  const longitude = JSON.parse(coords).longitude;
  const latitude = JSON.parse(coords).latitude;
  longitudeInput.value = longitude;
  latitudeInput.value = latitude;
}

chrome.runtime.onMessage.addListener((request) => {
  switch (request.command) {
    case 'update-cloud-status': {
      cloudStatus(selectCloud);
      break;
    }
  }
});

document.addEventListener('click', (node) => {
  if (node.target.matches('.popover *')) return;
  const popover = document.querySelectorAll('.popover .popover-content');
  popover.forEach(e => e.classList.remove('popover-content--is-visible'));
});

chrome.runtime.sendMessage({ command: 'load-data' });
