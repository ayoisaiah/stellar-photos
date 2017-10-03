import alertify from 'alertifyjs';
import timeago from 'timeago.js';
import { convertTimeStamp, togglePopover, chainableClassList } from './components/helpers';
import saveToDropbox from './components/dropbox';
import { openSearch, closeSearch, searchPhotos } from './components/search';
import { toggleHistory, displayHistory } from './components/history';
import { handleClick, handleSubmit } from './components/handle';
import state from './components/state';
import { cloudStatus, tempUnit, updateCoords, updateCollections } from './components/options';

alertify.defaults = {
  notifier: {
    position: 'top-right',
  },
};

chrome.storage.local.get('nextImage', (result) => {
  const { nextImage } = result;
  if (nextImage) {
    const controls = document.querySelector('.controls');
    controls.insertAdjacentHTML('beforeend', `
      <div class="popover options-popover">
        <button class="control-button options-button" title="Options">
          <svg class="icon icon-settings"><use xlink:href="#icon-settings"></use></svg>
        </button> 
        <div class="popover-content">
          <div>
            <section class="saveTo">
              <span class="label">Cloud storage</span>
              <select class="chooseCloudStorage">
                <option value="dropboxToken" selected>Dropbox</option>
              </select>
              <span class="action"></span>
            </section>
  
            <form class="s-collections">
              <span class="label">Load photos from multiple <a href="https://unsplash.com/collections/">Unsplash collections</a> by adding their IDs below separated by commas:</span>
              <input type="text" name="s-collections__input" class="s-collections__input" value="" placeholder="Collection IDs" /> <br>
              <button type="submit" class="update-collections ladda-button" data-spinner-color="#ffffff" data-style="expand-right"><span class="ladda-label">Save Collections</span></button>
            </form>
          </div>
  
          <div>
            <section class="temperature-unit">
              <span class="label">Temperature Unit</span>
              <select class="chooseTempUnit">
                <option value="celsius">Celsius</option>
                <option value="fahrenheit">Fahrenheit</option>
              </select>
            </section>
  
            <form class="weather-coords">
              <span class="label">Paste <a href="https://www.latlong.net/">your coordinates</a> here to get current weather information.</span>
              <label class="label longitude-label" for="longitude">Longitude:</label>
              <input type="text" name="longitude" class="longitude" placeholder="longitude" value="">
              <label class="label latitude-label" for="latitude">Latitude:</label>
              <input type="text" name="latitude" class="latitude" placeholder="latitude" value="">
              <button type="submit" class="update-coords">Save Coordinates</button>
            </form>
          </div>
  
        </div>
      </div>
  
      <a href="${nextImage.links.download}?force=true" class="control-button download-button" download title="Download photo">
        <svg class="icon icon-download"><use xlink:href="#icon-download"></use></svg>
      </a>
  
      <button data-imageid="${nextImage.id}" data-downloadurl="${nextImage.links.download}" class="control-button dropbox-button" title="Save photo to Dropbox">
        <svg class="icon icon-cloud"><use xlink:href="#icon-cloud"></use></svg>
      </button>
  
      <div class="popover info-popover">
        <button class="control-button info-button">
          <svg class="icon icon-info"><use xlink:href="#icon-info"></use></svg>
        </button> 
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

  const dropboxButton = document.querySelector('.dropbox-button');
  dropboxButton.addEventListener('click', () => {
    const imageId = dropboxButton.dataset.imageid;
    const downloadUrl = dropboxButton.dataset.downloadurl;

    saveToDropbox(imageId, downloadUrl);
  });

  const infoButton = document.querySelector('.info-button');
  infoButton.addEventListener('click', () => {
    togglePopover('.info-popover');
  });

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

  chrome.storage.sync.get('tempUnit', (d) => {
    if (!d.tempUnit) {
      tempUnit(selectTempUnit);
    } else {
      const unit = d.tempUnit;
      selectTempUnit.value = unit;
    }
  });

  chrome.storage.sync.get('collections', (d) => {
    const { collections } = d;
    const collectionsInput = document.querySelector('.s-collections__input');
    collectionsInput.value = collections;

    const collectionsForm = document.querySelector('.s-collections');
    collectionsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = collectionsInput.value.trim().replace(/ /g, '');
      updateCollections(value);
    });
  });


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


  chrome.storage.sync.get('coords', (d) => {
    const { coords } = d;
    if (coords) {
      const longitudeInput = document.querySelector('.longitude');
      const latitudeInput = document.querySelector('.latitude');
      const { longitude, latitude } = coords;
      longitudeInput.value = longitude;
      latitudeInput.value = latitude;
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
});


chrome.storage.local.get('forecast', (result) => {
  const { forecast } = result;

  if (forecast) {
    const weather = document.querySelector('.weather');
    weather.insertAdjacentHTML('beforeend', `
      <span class="location">
        <svg class="icon location-icon"><use xlink:href="#icon-location"></use></svg>
        <span class="location-text">${forecast.name}</span>
      </span>
      <span class="temperature">
        <svg class="icon temperature-icon">
          <use xlink:href="#icon-temperature"></use>
        </svg>
        <span class="temperature-text">${Math.round(forecast.main.temp)}° - ${forecast.weather[0].description}</span>
      </span>
      <span class="last-updated">${timeago().format(new Date(forecast.timestamp))}</span>
    `);
  }
});


chrome.storage.local.get('history', (result) => {
  const { history } = result;
  if (history) {
    const historyButton = document.getElementById('historyButton');
    historyButton.addEventListener('click', toggleHistory);
    displayHistory(history);
  }
});


const loadMore = document.querySelector('.moreResults-button');
loadMore.addEventListener('click', () => searchPhotos(state.searchKey, state.page));

const searchButtonOpen = document.getElementById('searchButton-open');
searchButtonOpen.addEventListener('click', openSearch);

const searchButtonClose = document.getElementById('searchButton-close');
searchButtonClose.addEventListener('click', closeSearch);

const uiElements = document.querySelectorAll('.s-ui');
uiElements.forEach(element => chainableClassList(element).remove('hidden'));

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

document.addEventListener('click', (node) => {
  if (node.target.matches('.popover *')) return;
  const popover = document.querySelectorAll('.popover .popover-content');
  popover.forEach(e => e.classList.remove('popover-content--is-visible'));
});
