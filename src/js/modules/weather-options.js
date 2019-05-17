import { $ } from '../libs/helpers';
import notifySnackbar from '../libs/notify-snackbar';

/*
 * This component handles the weather options
 */

const updateTemperatureFormat = event => {
  const selected = event.target[event.target.selectedIndex].value;
  chrome.storage.sync.set({ temperatureFormat: selected });

  chrome.runtime.sendMessage({ command: 'update-weather' });
};

const updateCoordinates = event => {
  event.preventDefault();

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

    chrome.storage.sync.set({ coords }, () => {
      notifySnackbar('Coordinates updated successfully');

      chrome.runtime.sendMessage({ command: 'update-weather' });
    });
  }
};

const initializeWeatherOptions = () => {
  const selectTempFormat = $('select-temperature-format');

  chrome.storage.sync.get('temperatureFormat', d => {
    if (!d.temperatureFormat) {
      chrome.storage.sync.set({ temperatureFormat: 'metric' });
    } else {
      const { temperatureFormat } = d;
      selectTempFormat.value = temperatureFormat;
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

export { updateCoordinates, initializeWeatherOptions, updateTemperatureFormat };
