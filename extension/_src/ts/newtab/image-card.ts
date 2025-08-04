import { LitElement, TemplateResult, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import {
  getCloudSaveEvent,
  getDownloadEvent,
  setBackgroundEvent,
} from './custom-events';
import {
  dropboxIcon,
  oneDriveIcon,
  googleDriveIcon,
  anchorIcon,
  downloadIcon,
  imageIcon,
} from './icons';

@customElement('image-card')
class ImageCard extends LitElement {
  #cloudServices = {
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
    googledrive: 'Google Drive',
  };

  getCurrentCloud(): TemplateResult {
    switch (this.cloudService) {
      case 'dropbox':
        return dropboxIcon;
      case 'onedrive':
        return oneDriveIcon;
      case 'googledrive':
        return googleDriveIcon;
    }

    return html``;
  }

  static override styles = [unsafeCSS(tailwind)];

  @property({ type: String })
  cloudService: ChromeLocalStorage['cloudService'];

  @property({ type: Object })
  image!: UnsplashImage;

  @property({ type: Boolean })
  searchResult = false;

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
        class="relative h-[140px]"
        id="photo-${id}"
        style="background: url(${backgroundPhoto}) rgb(239, 239, 239)
      top center no-repeat; background-size: cover;"
      >
        <div
          class="items-between absolute bottom-0 left-0 right-0 top-0 flex w-full flex-col justify-between rounded bg-black/75 p-2 text-white opacity-0 hover:opacity-100"
        >
          <div class="flex w-full items-center justify-between">
            <a
              class="user"
              aria-label="View photographer profile"
              target="_blank"
              rel="noopener"
              title="View photographer profile"
              href="${photographer}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
            >
              <img class="mr-4 w-8 rounded-full" src="${photographerPicture}" />
              ${this.searchResult
                ? html`<span class="username">${photographerName}</span>`
                : nothing}
            </a>

            <a
              href="${linkToPhoto}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
              data-imageid=${id}
              target="_blank"
              aria-label="View image on Unsplash.com"
              title="View image on Unsplash.com"
            >
              ${anchorIcon}
            </a>
          </div>

          <div class="bottom flex items-center justify-between">
            ${this.searchResult
              ? html`<span class="s-photo-dimension"
                  >${width} x ${height}</span
                >`
              : html`
                  <button
                    class="bg-transparent"
                    title="Set as background image"
                    @click=${() => this.dispatchEvent(setBackgroundEvent(id))}
                  >
                    ${imageIcon}
                  </button>
                `}

            <div>
              <button
                class="mr-3"
                id="${this.cloudService}-button"
                @click=${() =>
                  this.dispatchEvent(
                    getCloudSaveEvent(id, photo.urls?.full, this.cloudService)
                  )}
                title="Save photo to ${this.#cloudServices[this.cloudService!]}"
              >
                ${this.getCurrentCloud()}
              </button>
              <button
                class="control-button download-button"
                data-imageid=${id}
                title="Download photo"
                @click=${() =>
                  this.dispatchEvent(
                    getDownloadEvent(photo.id, photo.urls?.full)
                  )}
              >
                ${downloadIcon}
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
