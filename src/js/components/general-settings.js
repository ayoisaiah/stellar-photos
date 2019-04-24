import { html } from 'lit-html';
import {
  openDefaultTab,
  openChromeApps,
  updatePhotoFrequency,
  updateImageSource,
  updateCollections,
} from '../libs/handle';

/*
 * General settings
 */

const generalSettings = () => html`
  <section id="general-settings" class="general-settings">
    <h3 class="settings-heading">General</h3>

    <!-- /* CHROME_START */ -->
    <div class="chrome-buttons">
      <button @click=${openDefaultTab} id="show-default-tab" class="show-default-tab"
    aria-dialog-label="Open Default Tab">
      Open Default Tab
      </button>

      <button @click=${openChromeApps} id="show-chrome-apps" class="show-chrome-apps"
    aria-label="Show Chrome Apps">
      Show Apps
      </button>
    </div>
    <!-- /* CHROME_END */ -->

    <div class="photo-settings">
      <div>
        <span class="dialog-label">
          How often should new photos be loaded?
        </span>

        <select id="select-photo-frequency"
          @input=${updatePhotoFrequency}
          class="select-photo-frequency" name="photo-frequency">
          <option value="newtab">On every new tab (default)</option>
          <option value="every15minutes">Every 15 minutes</option>
          <option value="everyhour">Every hour</option>
          <option value="everyday">Every day</option>
        </select>
      </div>

      <form id="unsplash-collections" class="unsplash-collections">
        <span class="dialog-label">Where should the images be fetched from?</span>
        <div class="radio-container">
          <input type="radio" @change=${updateImageSource} id="official-collection" name="image-source" value="official">
          <label for="official-collection">The official Stellar Photos collection</label>
        </div>
        <div class="radio-container">
          <input @change=${updateImageSource} type="radio" id="custom-collection" name="image-source" value="custom">
          <label for="custom-collection">Custom collection</label>
        </div>

        <div class="custom-collection">
          <div class="custom-collection-input">
            <input type="text" name="unsplash-collections__input"
            class="unsplash-collections__input" id="unsplash-collections__input"
            value="" placeholder="Collection IDs"/>

            <span data-tooltip="Enter Unsplash collection IDs here.\n Multiple collections can be separated by commas.">
              <svg class="icon icon-info"><use href="#icon-info"></use></svg>
            </span>
          </div>


          <button type="button" @click=${updateCollections} class="update-collections ladda-button"
        data-spinner-color="#ffffff"
        data-style="expand-right"
            <span class="ladda-dialog-label">Save Collections</span>
          </button>
        </div>

      </form>


    </div>


  </section>
`;

export default generalSettings;
