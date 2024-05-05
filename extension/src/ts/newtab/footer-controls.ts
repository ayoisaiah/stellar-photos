import { LitElement, TemplateResult, html, svg, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import {
  getCloudSaveEvent,
  getDownloadEvent,
  togglePausedEvent,
} from './custom-events';
import {
  cogIcon,
  downloadIcon,
  playIcon,
  dropboxIcon,
  oneDriveIcon,
  googleDriveIcon,
} from './icons';

@customElement('footer-controls')
class FooterControls extends LitElement {
  static override styles = [unsafeCSS(tailwind)];

  #cloudServices = {
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
    googledrive: 'Google Drive',
  };

  @property({ type: Object })
  bgImage = <UnsplashImage>{};

  @property({ type: Boolean })
  imagePaused = false;

  @property({ type: String })
  cloudService: ChromeLocalStorage['cloudService'];

  getCurrentCloud(): TemplateResult {
    switch (this.cloudService) {
      case 'dropbox':
        return dropboxIcon;
      case 'onedrive':
        return oneDriveIcon;
      case 'googledrive':
        return googleDriveIcon;
    }

    return svg``;
  }

  override render() {
    return html`<section
      class="flex h-full items-end text-white"
      id="footer-controls"
    >
      <button
        class="${this.imagePaused ? '' : 'hidden'} bg-transparent"
        id="play-button"
        title="Unpause background image"
        @click=${() => this.dispatchEvent(togglePausedEvent)}
      >
        <svg
          class="mr-8 w-8"
          fill="currentColor"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          ${playIcon}
        </svg>
      </button>

      <button
        class="mr-8"
        id="${this.cloudService}-button"
        @click=${() =>
          this.dispatchEvent(
            getCloudSaveEvent(
              this.bgImage.id,
              this.bgImage.urls?.raw,
              this.cloudService
            )
          )}
        title="Save photo to ${this.#cloudServices[this.cloudService!]}"
      >
        ${this.getCurrentCloud()}
      </button>

      <button
        class="mr-8 bg-transparent"
        id="download-button"
        title="Download current photo"
        @click=${() =>
          this.dispatchEvent(
            getDownloadEvent(this.bgImage.id, this.bgImage.urls?.full)
          )}
      >
        ${downloadIcon}
      </button>

      <button class="bg-transparent" title="Open Stellar Photos Settings">
        ${cogIcon}
      </button>
    </section> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'footer-controls': FooterControls;
  }
}
