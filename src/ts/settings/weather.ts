import { html, TemplateResult } from 'lit-html';
import notifySnackbar from '../../js/libs/notify-snackbar';
import { ChromeStorage } from '../types';

function updateTemperatureFormat(event: { target: HTMLSelectElement }): void {
  const selected = event.target[
    event.target.selectedIndex
  ] as HTMLOptionElement;
  const { value } = selected;
  chrome.storage.sync.set({ temperatureFormat: value });

  chrome.runtime.sendMessage({ command: 'update-weather' });
}

function updateCoordinates(event: InputEvent): void {
  event.preventDefault();

  const longitudeInput = document.getElementById(
    'js-longitude-input'
  ) as HTMLInputElement;
  const latitudeInput = document.getElementById(
    'js-latitude-input'
  ) as HTMLInputElement;
  const [longitude, latitude] = [
    Number(longitudeInput.value),
    Number(latitudeInput.value),
  ];

  if (
    longitude <= 180 &&
    longitude >= -180 &&
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
}

function weatherSettings(settings: ChromeStorage): TemplateResult {
  return html`
    <section id="weather-settings" class="weather-settings">
      <h3 class="settings-heading">Weather</h3>
      <form
        @submit=${updateCoordinates}
        class="weather-coordinates"
        id="weather-coordinates"
      >
        <span class="dialog-label"
          >Paste
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.latlong.net/"
            >your coordinates</a
          >
          here to get current weather information for your city.</span
        >

        <label class="dialog-label latitude-dialog-label" for="latitude"
          >Latitude:</label
        >

        <input
          type="text"
          name="latitude"
          class="latitude-input"
          id="js-latitude-input"
          placeholder="latitude"
          value=${settings.coords?.latitude ?? ''}
        />

        <label class="dialog-label longitude-dialog-label" for="longitude"
          >Longitude:</label
        >

        <input
          type="text"
          name="longitude"
          class="longitude-input"
          id="js-longitude-input"
          placeholder="longitude"
          value=${settings.coords?.longitude ?? ''}
        />

        <button type="submit" class="update-coords">Save Coordinates</button>
      </form>

      <section class="temperature-unit">
        <span class="dialog-label">Show the temperature in</span>

        <select
          @input=${updateTemperatureFormat}
          id="select-temperature-format"
          class="select-temperature-unit"
        >
          <option
            value="metric"
            ?selected=${settings.temperatureFormat === 'metric'}
          >
            Celsius
          </option>
          <option
            value="imperial"
            ?selected=${settings.temperatureFormat === 'imperial'}
          >
            Fahrenheit
          </option>
        </select>
      </section>
    </section>
  `;
}

export default weatherSettings;
