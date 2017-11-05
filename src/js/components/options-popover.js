/*
 * The options popover
 */

const optionsPopover = () => `
      <div class="popover options-popover">
        <button class="control-button options-button" title="Options">
          <svg class="icon icon-settings"><use href="#icon-settings"></use></svg>
        </button> 
        <div class="popover-content">
          <div>
            <section class="saveTo">
              <span class="label">Connect and sync photos to your Dropbox. <a href="https://github.com/ayoisaiah/stellar-photos/wiki/Privacy-Policy">Privacy Policy</a></span>
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
`;

export default optionsPopover;
