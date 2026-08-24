import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import { UnsplashImage } from '../types/unsplash';

@customElement('stellar-settings')
class Settings extends LitElement {
  static override styles = [unsafeCSS(tailwind)];

  // @property({ type: Object })
  // bgImage!: UnsplashImage;

  openDefaultTab(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.update({
      url: 'chrome-search://local-ntp/local-ntp.html',
      active: true,
      highlighted: true,
    });
  }

  openChromeApps(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.update({
      url: 'chrome://apps/',
      active: true,
      highlighted: true,
    });
  }

  override render() {
    return html`<div
      class="absolute left-1/2 top-1/2 h-5/6 w-4/12 -translate-x-1/2 -translate-y-1/2 border-2  border-red-300 px-8 py-4 text-3xl"
    >
      <!-- /* CHROME_START */ -->
      <div class="chrome-buttons">
        <button
          class="button"
          id="show-default-tab"
          @click=${this.openDefaultTab}
          aria-label="Open Default Tab"
        >
          Open Default Tab
        </button>

        <button
          class="button"
          id="show-chrome-apps"
          @click=${this.openChromeApps}
          aria-label="Show Chrome Apps"
        >
          Show Apps
        </button>
      </div>
      <!-- /* CHROME_END */ -->

      <section id="image-settings">
        <h2>Image settings</h2>
        <div class="field photo-frequency">
          <label class="label dialog-label">Image update frequency</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select
                class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                name="photo-frequency"
              >
                <option value="newtab">Every new tab</option>
                <option value="every15minutes">Every 15 minutes</option>
                <option value="everyhour">Every hour</option>
                <option value="everyday">Every 24 hours</option>
              </select>
            </div>
          </div>
        </div>

        <div class="field image-resolution">
          <label class="label dialog-label">Preferred image resolution</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select
                class="select-image-resolution"
                id="select-image-resolution"
                name="image-resolution"
              >
                <option value="standard">Standard (2000px width)</option>
                <option value="high">High (4000px width)</option>
                <option value="max">Max (Highest available resolution)</option>
              </select>
            </div>
            <p class="help">
              Higher resolution images will take longer to load.
            </p>
          </div>
        </div>

        <div class="field">
          <label>Filter images</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select id="select-image-filter" name="image-filter">
                <option value="collection-topics">Collection and Topics</option>
                <option value="query">Query</option>
              </select>
            </div>
            <p class="help">
              Higher resolution images will take longer to load.
            </p>
          </div>
        </div>

        <div class="field">
          <label>Unsplash collections</label>
          <div class="control">
            <input
              id="unsplash-collections"
              type="text"
              name="unsplash-collections"
              placeholder="Enter collection IDs here"
            />
          </div>
          <p class="help">
            Enter Unsplash collection IDs here, seperated by commas.
          </p>
        </div>

        <div class="field">
          <label>Topics</label>
          <div class="control">
            <input
              id="unsplash-topics"
              type="text"
              name="unsplash-topics"
              placeholder="Enter topic IDs here"
            />
          </div>
          <p class="help">
            Enter Unsplash topic IDs here, seperated by commas.
          </p>
        </div>

        <div class="field">
          <label>Query</label>
          <div class="control">
            <input
              id="unsplash-query"
              type="search"
              name="unsplash-query"
              placeholder="Search Unsplash"
            />
          </div>
          <p class="help">Enter your search query here</p>
        </div>

        <div class="field">
          <label>Username</label>
          <div class="control">
            <input
              id="unsplash-username"
              type="search"
              name="unsplash-username"
              placeholder="Filter by username"
            />
          </div>
          <p class="help">Limit images to a single user</p>
        </div>

        <div class="field">
          <label>Content filter</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select id="content-filter" name="content-filter">
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-settings': Settings;
  }
}
