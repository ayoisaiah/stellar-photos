import { html } from 'lit-html';
import {
  updateCoordinates,
  updateTemperatureFormat,
} from '../modules/weather-options';

/*
 * Settings for weather
 */

const weatherSettings = () => html`
  <section id="weather-settings" class="weather-settings">
    <h3 class="settings-heading">Weather</h3>
    <form
      @submit=${updateCoordinates}
      class="weather-coordinates"
      id="weather-coordinates"
    >
      <span class="dialog-label"
        >Paste
        <a href="https://www.latlong.net/">your coordinates</a>
        here to get current weather information for your city.</span
      >

      <label class="dialog-label latitude-dialog-label" for="latitude"
        >Latitude:</label
      >

      <input
        type="text"
        name="latitude"
        class="latitude-input"
        id="latitude-input"
        placeholder="latitude"
        value=""
      />

      <label class="dialog-label longitude-dialog-label" for="longitude"
        >Longitude:</label
      >

      <input
        type="text"
        name="longitude"
        class="longitude-input"
        id="longitude-input"
        placeholder="longitude"
        value=""
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
        <option value="metric">Celsius</option>
        <option value="imperial">Fahrenheit</option>
      </select>
    </section>
  </section>
`;

export default weatherSettings;
