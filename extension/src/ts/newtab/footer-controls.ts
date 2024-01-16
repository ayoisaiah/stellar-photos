import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import {
  getCloudSaveEvent,
  getDownloadEvent,
  openInfoEvent,
  togglePausedEvent,
} from './custom-events';

@customElement('footer-controls')
class FooterControls extends LitElement {
  #cloudServices = {
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
    googledrive: 'Google Drive',
  };

  override createRenderRoot(): this {
    return this;
  }

  @property({ type: Object })
  nextImage = <UnsplashImage>{};

  @property({ type: Boolean })
  imagePaused = false;

  @property({ type: String })
  cloudService: ChromeLocalStorage['cloudService'];

  override render() {
    return html`<section class="controls" id="footer-controls">
      <button
        class="${this.imagePaused
          ? ''
          : 'is-hidden'} control-button unsplash-button js-play-button"
        id="js-play-button"
        title="Background image has been paused. Click to unpause"
        target="_blank"
        rel="noopener"
        @click=${() => this.dispatchEvent(togglePausedEvent)}
      >
        <svg class="icon icon-play">
          <use href="#icon-play"></use>
        </svg>
      </button>
      <a
        class="control-button unsplash-button js-info-button"
        title="View image on Unsplash"
        href="${this.nextImage.links
          .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
        target="_blank"
        rel="noopener"
      >
        <svg class="icon icon-anchor">
          <use href="#icon-anchor"></use>
        </svg>
      </a>
      <button
        class="control-button download-button"
        data-imageid=${this.nextImage.id}
        data-downloadurl=${this.nextImage.urls?.full}
        title="Download photo"
        @click=${() =>
          this.dispatchEvent(
            getDownloadEvent(this.nextImage.id, this.nextImage.urls?.full)
          )}
      >
        <svg class="icon icon-download">
          <use href="#icon-download"></use>
        </svg>
      </button>

      <button
        class="control-button cloud-button ${this.cloudService}-button"
        @click=${() =>
          this.dispatchEvent(
            getCloudSaveEvent(
              this.nextImage.id,
              this.nextImage.urls?.raw,
              this.cloudService
            )
          )}
        title="Save photo to ${this.#cloudServices[this.cloudService!]}"
      >
        <svg class="icon icon-cloud">
          <use href="#icon-${this.cloudService}"></use>
        </svg>
      </button>

      <button
        class="control-button info-button js-info-button"
        @click=${() => this.dispatchEvent(openInfoEvent)}
        title="Photo info"
      >
        <svg class="icon icon-info"><use href="#icon-info"></use></svg>
      </button>
    </section> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'footer-controls': FooterControls;
  }
}
