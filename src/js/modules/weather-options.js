import purify from '../libs/purify-dom';
import { $ } from '../libs/helpers';
import notifySnackbar from '../libs/notify-snackbar';
import weatherPopoverView from '../components/weather-popover-view';

/*
 * This component handles the weather options
 */

const tempUnit = selectTempUnit => {
  const selected = selectTempUnit[selectTempUnit.selectedIndex].value;
  chrome.storage.sync.set({ tempUnit: selected });

  notifySnackbar('Preferences saved successfully');

  chrome.runtime.sendMessage({ command: 'update-weather' });
};

const updateCoordinates = coords => {
  chrome.storage.sync.set({ coords }, () => {
    notifySnackbar('Coordinates updated successfully');

    chrome.runtime.sendMessage({ command: 'update-weather' });
  });
};

const initializeWeatherOptions = () => {
  const popoverView = $('popover-view');
  popoverView.insertAdjacentHTML(
    'afterbegin',
    purify.sanitize(weatherPopoverView())
  );

  const selectTempUnit = $('select-temperature-unit');
  const saveTemperatureUnit = $('save-temperature-unit');
  saveTemperatureUnit.addEventListener('click', () => {
    tempUnit(selectTempUnit);
  });

  chrome.storage.sync.get('tempUnit', d => {
    if (!d.tempUnit) {
      chrome.storage.sync.set({ tempUnit: 'celsius' });
    } else {
      const unit = d.tempUnit;
      selectTempUnit.value = unit;
    }
  });

  const weatherCoords = $('weather-coordinates');
  weatherCoords.addEventListener('submit', e => {
    e.preventDefault();

    const longitude = $('longitude-input').value;
    const latitude = $('latitude-input').value;

    if (
      typeof Number(longitude) === 'number' &&
      longitude <= 180 &&
      longitude >= -180 &&
      typeof Number(latitude) === 'number' &&
      latitude <= 90 &&
      latitude >= -90
    ) {
      const coords = {
        longitude,
        latitude,
      };
      updateCoordinates(coords);
    }
  });

  chrome.storage.sync.get('coords', d => {
    const { coords } = d;
    if (coords) {
      const { longitude, latitude } = coords;
      const longitudeInput = $('longitude-input');
      const latitudeInput = $('latitude-input');
      longitudeInput.value = longitude;
      latitudeInput.value = latitude;
    }
  });
};

export default initializeWeatherOptions;
