/*
 * Settings for weather
 */

const weatherPopoverView = () => `
  <section id="weather-settings" class="weather-settings">
    
    <form class="weather-coordinates" id="weather-coordinates">
      <span class="popover-label">Paste 
        <a href="https://www.latlong.net/">your coordinates</a> 
        here to get current weather information.</span>

      <label class="popover-label longitude-popover-label" for="longitude">Longitude:</label>
      
      <input type="text" name="longitude" 
        class="longitude" 
        id="longitude-input"
        placeholder="longitude" value="">
      
      <label class="popover-label latitude-popover-label" for="latitude">Latitude:</label>
      
      <input type="text" name="latitude" 
        class="latitude" 
        id="latitude-input"
        placeholder="latitude" value="">

      <button type="submit" class="update-coords">Save Coordinates</button>
    </form>

    <section class="temperature-unit">
      <span class="popover-label">Temperature Unit</span>

      <select id="select-temperature-unit" class="select-temperature-unit">
        <option value="celsius">Celsius</option>
        <option value="fahrenheit">Fahrenheit</option>
      </select>

      <button id="save-temperature-unit">Save</button>
    </section>
  </section>
`;

export default weatherPopoverView;
