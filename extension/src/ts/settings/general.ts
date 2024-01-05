import * as Ladda from 'ladda';
import { html, TemplateResult } from 'lit-html';
import { validateCollections } from '../requests';
import { ChromeStorage } from '../types/index';
import { snackbar } from '../ui/snackbar';
import { $ } from '../helpers';

/* CHROME_START */
function openDefaultTab(e: MouseEvent): void {
  e.preventDefault();
  chrome.tabs.update({
    url: 'chrome-search://local-ntp/local-ntp.html',
    active: true,
    highlighted: true,
  });
}

function openChromeApps(e: MouseEvent): void {
  e.preventDefault();
  chrome.tabs.update({
    url: 'chrome://apps/',
    active: true,
    highlighted: true,
  });
}
/* CHROME_END */

async function updateImageResolution(event: {
  target: HTMLSelectElement;
}): Promise<void> {
  const selected = event.target[
    event.target.selectedIndex
  ] as HTMLOptionElement;

  chrome.storage.sync.set({ imageResolution: selected.value });
}

async function updatePhotoFrequency(event: {
  target: HTMLSelectElement;
}): Promise<void> {
  const selected = event.target[
    event.target.selectedIndex
  ] as HTMLOptionElement;
  const { value } = selected;

  chrome.storage.sync.set({ photoFrequency: selected.value });

  switch (value) {
    case 'newtab':
      chrome.runtime.sendMessage({ command: 'refresh' });
      break;
    case 'every15minutes':
      chrome.alarms.create('loadphoto', {
        periodInMinutes: 15,
      });
      break;
    case 'everyhour':
      chrome.alarms.create('loadphoto', {
        periodInMinutes: 60,
      });
      break;
    case 'everyday':
      chrome.alarms.create('loadphoto', {
        periodInMinutes: 1440,
      });
      break;
    case 'paused':
      chrome.alarms.clear('loadphoto');
      break;
  }
}

async function updateImageSource(event: {
  target: HTMLInputElement;
}): Promise<void> {
  const { value } = event.target;
  chrome.storage.sync.set({ imageSource: value });
  const customCollection = document.querySelector('.custom-collection');

  if (customCollection) {
    if (value === 'custom') {
      customCollection.classList.add('is-visible');
    } else {
      customCollection.classList.remove('is-visible');
    }
  }
}

async function updateCollections(): Promise<void> {
  const collectionsInput = $('js-collections-input') as HTMLInputElement;
  const collections = collectionsInput.value.trim().replace(/ /g, '');
  const spinner = Ladda.create(
    document.querySelector('.update-collections') as HTMLButtonElement
  );

  try {
    if (!collections) throw Error('At least one collection ID must be present');

    spinner.start();

    await validateCollections(collections);

    chrome.storage.sync.set({ collections });

    snackbar('Collections saved successfully');
    chrome.runtime.sendMessage({ command: 'refresh' });
  } catch (err: any) {
    snackbar(err.message, 'error');
  } finally {
    spinner.stop();
  }
}

function generalSettings(settings: ChromeStorage): TemplateResult {
  const customInput = settings.imageSource === 'custom' ? 'is-visible' : '';
  const collections = settings.collections || '';

  return html`
    <section id="general-settings" class="general-settings">
      <h3 class="subtitle is-4">General</h3>

      <!-- /* CHROME_START */ -->
      <div class="chrome-buttons">
        <button
          @click=${openDefaultTab}
          id="show-default-tab"
          class="button show-default-tab"
          aria-dialog-label="Open Default Tab"
        >
          Open Default Tab
        </button>

        <button
          @click=${openChromeApps}
          id="show-chrome-apps"
          class="button show-chrome-apps"
          aria-label="Show Chrome Apps"
        >
          Show Apps
        </button>
      </div>
      <!-- /* CHROME_END */ -->

      <div class="photo-settings">
        <div class="field photo-frequency">
          <label class="label dialog-label"> Change background image </label>
          <div class="control">
            <div class="select is-fullwidth">
              <select
                id="select-photo-frequency"
                @input=${updatePhotoFrequency}
                class="select-photo-frequency"
                name="photo-frequency"
              >
                <option
                  value="newtab"
                  ?selected=${settings.photoFrequency === 'newtab'}
                >
                  Every new tab
                </option>
                <option
                  value="every15minutes"
                  ?selected=${settings.photoFrequency === 'every15minutes'}
                >
                  Every 15 minutes
                </option>
                <option
                  value="everyhour"
                  ?selected=${settings.photoFrequency === 'everyhour'}
                >
                  Every hour
                </option>
                <option
                  value="everyday"
                  ?selected=${settings.photoFrequency === 'everyday'}
                >
                  Every 24 hours
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="field image-resolution">
          <label class="label dialog-label"> Preferred image resolution </label>
          <div class="control">
            <div class="select is-fullwidth">
              <select
                id="select-image-resolution"
                @input=${updateImageResolution}
                class="select-image-resolution"
                name="image-resolution"
              >
                <option
                  value="standard"
                  ?selected=${settings.imageResolution === 'standard'}
                >
                  Standard (2000px width)
                </option>
                <option
                  value="high"
                  ?selected=${settings.imageResolution === 'high'}
                >
                  High (4000px width)
                </option>
                <option
                  value="max"
                  ?selected=${settings.imageResolution === 'max'}
                >
                  Max (Highest available resolution)
                </option>
              </select>
            </div>
            <p class="help">
              Higher resolution images will take longer to load.
            </p>
          </div>
        </div>

        <form id="unsplash-collections" class="unsplash-collections">
          <div class="field">
            <label class="label dialog-label">Image source</label>
            <div class="control">
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
                <div class="field custom-collection-input">
                  <div class="control">
                    <input
                      type="text"
                      name="unsplash-collections__input"
                      class="input unsplash-collections__input"
                      id="js-collections-input"
                      value=${collections}
                      placeholder="Collection IDs"
                    />
                  </div>
                  <p class="help">
                    Enter Unsplash collection IDs here, seperated by commas.
                  </p>
                </div>
                <button
                  type="button"
                  @click=${updateCollections}
                  class="button is-link update-collections ladda-button"
                  data-style="expand-right"
                >
                  <span class="ladda-label">Save Collections</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  `;
}

export default generalSettings;
