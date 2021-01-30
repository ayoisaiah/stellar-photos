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
  } catch (err) {
    snackbar(err, 'error');
  } finally {
    spinner.stop();
  }
}

function generalSettings(settings: ChromeStorage): TemplateResult {
  const customInput = settings.imageSource === 'custom' ? 'is-visible' : '';
  const collections = settings.collections || '';

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
            >
              On every new tab (default)
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
              Every day
            </option>

            <option
              value="paused"
              ?selected=${settings.photoFrequency === 'paused'}
            >
              Pause
            </option>
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
                id="js-collections-input"
                value=${collections}
                placeholder="Collection IDs"
              />

              <span
                data-tooltip="Enter one or more Unsplash collection IDs here.
 For example, 998309 is the collection ID for https://unsplash.com/collections/998309/stellar-photos.
 Separate multiple collection IDs with commas."
              >
                <svg
                  id="icon-info"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <title>Info</title>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="8"></line>
                </svg>
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
}

export default generalSettings;
