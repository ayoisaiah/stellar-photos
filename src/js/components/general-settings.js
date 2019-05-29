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

const generalSettings = settings => {
  const customInput = settings.imageSource === 'custom' ? 'is-visible' : '';

  return html`
    <section id="general-settings" class="general-settings">
      <h3 class="settings-heading">General</h3>

      <!-- /* CHROME_START */ -->
      <div class="chrome-buttons">
        <button
          @click=${openDefaultTab}
          id="show-default-tab"
          class="show-default-tab"
          aria-dialog-label="Open Default Tab"
        >
          Open Default Tab
        </button>

        <button
          @click=${openChromeApps}
          id="show-chrome-apps"
          class="show-chrome-apps"
          aria-label="Show Chrome Apps"
        >
          Show Apps
        </button>
      </div>
      <!-- /* CHROME_END */ -->

      <div class="photo-settings">
        <div>
          <span class="dialog-label">
            How often should new photos be loaded?
          </span>

          <select
            id="select-photo-frequency"
            @input=${updatePhotoFrequency}
            class="select-photo-frequency"
            name="photo-frequency"
          >
            <option
              value="newtab"
              ?selected=${settings.photoFrequency === 'newtab'}
              >On every new tab (default)</option
            >
            <option
              value="every15minutes"
              ?selected=${settings.photoFrequency === 'every15minutes'}
              >Every 15 minutes</option
            >
            <option
              value="everyhour"
              ?selected=${settings.photoFrequency === 'everyhour'}
              >Every hour</option
            >
            <option
              value="everyday"
              ?selected=${settings.photoFrequency === 'everyday'}
              >Every day</option
            >
          </select>
        </div>

        <form id="unsplash-collections" class="unsplash-collections">
          <span class="dialog-label"
            >Where should the images be fetched from?</span
          >
          <div class="radio-container">
            <input
              type="radio"
              @change=${updateImageSource}
              id="official-collection"
              name="image-source"
              value="official"
              ?checked=${settings.imageSource === 'official'}
            />
            <label for="official-collection"
              >The official
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://unsplash.com/collections/998309/stellar-photos"
                >Stellar Photos collection</a
              ></label
            >
          </div>
          <div class="radio-container">
            <input
              @change=${updateImageSource}
              ?checked=${settings.imageSource === 'custom'}
              type="radio"
              id="custom-collection"
              name="image-source"
              value="custom"
            />
            <label for="custom-collection"
              >Custom
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://unsplash.com/collections"
                >Unsplash collections</a
              ></label
            >
          </div>

          <div class="custom-collection ${customInput}">
            <div class="custom-collection-input">
              <input
                type="text"
                name="unsplash-collections__input"
                class="unsplash-collections__input"
                id="unsplash-collections__input"
                value=${settings.collections}
                placeholder="Collection IDs"
              />

              <span
                data-tooltip="Enter one or more Unsplash collection IDs here.\n For example, 998309 is the collection ID for https://unsplash.com/collections/998309/stellar-photos.\n Separate multiple collection IDs with commas."
              >
                <svg class="icon icon-info"><use href="#icon-info"></use></svg>
              </span>
            </div>

            <button
              type="button"
              @click=${updateCollections}
              class="update-collections ladda-button"
              data-style="expand-right"
            >
              <span class="ladda-label">Save Collections</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  `;
};

export default generalSettings;
