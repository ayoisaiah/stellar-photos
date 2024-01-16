import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import {
  getCloudSaveEvent,
  getDownloadEvent,
  getSetBackgroundEvent,
} from './custom-events';

@customElement('image-card')
class ImageCard extends LitElement {
  #cloudServices = {
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
    googledrive: 'Google Drive',
  };

  override createRenderRoot(): this {
    return this;
  }

  @property({ type: String })
  cloudService: ChromeLocalStorage['cloudService'];

  @property({ type: Object })
  image!: UnsplashImage;

  override render() {
    const photo = this.image;
    const backgroundPhoto = photo.base64 || photo.urls.small;
    const { width, height, id } = photo;
    const linkToPhoto = photo.links?.html ?? 'https://unsplash.com';
    const photographer = photo.user?.links?.html;
    const photographerPicture =
      photo.user?.profile_image?.small || '../images/profile_pic.svg';
    const photographerName = `${photo.user?.first_name || ''}
${photo.user?.last_name || ''}`;

    return html`
      <li
        class="s-photo"
        id="photo-${id}"
        style="background: url(${backgroundPhoto}) rgb(239, 239, 239)
      top center no-repeat; background-size: cover;"
      >
        <div class="s-photo-actions">
          <div class="top">
            <a
              class="user"
              aria-label="View photographer profile"
              target="_blank"
              rel="noopener"
              title="View photographer profile"
              href="${photographer}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
            >
              <img class="user-dp" src="${photographerPicture}" />
              <span class="username">${photographerName}</span>
            </a>

            <a
              href="${linkToPhoto}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
              data-imageid=${id}
              target="_blank"
              rel="noopener"
              aria-label="View photo on Unsplash.com"
              title="View photo on Unsplash.com"
            >
              <svg class="icon icon--anchor" style="fill: #fafafa;">
                <use xlink:href="#icon-anchor"></use>
              </svg>
            </a>
          </div>

          <div class="middle">
            <button
              class="control-button cloud-button ${this.cloudService}-button"
              @click=${() =>
                this.dispatchEvent(
                  getCloudSaveEvent(id, photo.urls?.raw, this.cloudService)
                )}
              title="Save photo to ${this.#cloudServices[this.cloudService!]}"
            >
              <svg class="icon icon-cloud">
                <use href="#icon-${this.cloudService}"></use>
              </svg>
            </button>
          </div>

          <div class="bottom">
            <span class="s-photo-dimension">${width} x ${height}</span>

            <div>
              <button
                class="control-button download-button"
                data-imageid=${id}
                data-downloadurl=${photo.urls?.full}
                title="Download photo"
                @click=${() =>
                  this.dispatchEvent(
                    getDownloadEvent(photo.id, photo.urls?.full)
                  )}
              >
                <svg class="icon icon-download">
                  <use href="#icon-download"></use>
                </svg>
              </button>

              <button
                class="control-button bg-button"
                title="Set as background image"
                data-imageid=${id}
                @click=${() => this.dispatchEvent(getSetBackgroundEvent(id))}
              >
                <svg class="icon icon--image" style="fill: #fafafa;">
                  <use xlink:href="#icon-image"></use>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </li>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'image-card': ImageCard;
  }
}
