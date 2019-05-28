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

export { updateCoordinates, updateTemperatureFormat };
