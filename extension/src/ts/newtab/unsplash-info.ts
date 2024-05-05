import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import { UnsplashImage } from '../types/unsplash';
import { mapIcon, cameraIcon } from './icons';

@customElement('unsplash-info')
class UnsplashInfo extends LitElement {
  static override styles = [unsafeCSS(tailwind)];

  @property({ type: Object })
  // TODO: Proper way to do this?
  bgImage!: UnsplashImage;

  @state()
  showExif = false;

  override render() {
    return html`
      <section
        class="flex flex-col text-3xl leading-relaxed text-white"
        id="unsplash-info"
      >
        <div class="mb-4 flex items-center" id="unsplash-photographer">
          <img
            class="mr-4 w-8 rounded-full"
            id="unsplash-profile-pic"
            src="${this.bgImage.user!.profile_image!.small!}"
          />
          <a
            target="_blank"
            rel="noopener"
            href="${this.bgImage.user?.links
              .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
          >
            ${this.bgImage.user?.first_name || nothing}
            ${this.bgImage.user?.last_name || nothing}
          </a>
        </div>

        ${this.bgImage.location?.name
          ? html`<div class="photo-location mb-4 flex items-center">
              <svg
                class="mr-4 w-8"
                fill="currentColor"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                ${mapIcon}
              </svg>
              <a
                target="_blank"
                rel="noopener"
                href="${this.bgImage.links
                  ?.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
                >${this.bgImage.location.name}</a
              >
            </div>`
          : nothing}

        <div class="relative flex items-center" id="unsplash-camera-info">
          <div
            class="${this.showExif
              ? 'opacity-100'
              : 'opacity-0'} absolute bottom-12 left-12 rounded bg-black/90 p-4"
          >
            <div class="mb-4" id="camera-model">
              <dt class="text-2xl text-gray-400">Camera</dt>
              <dd>${this.bgImage.exif!.model}</dd>
            </div>
            <div class="mb-4" id="image-summary">
              <dt class="text-2xl text-gray-400">Lens</dt>
              <dd>
                ${this.bgImage.exif!.focal_length}mm
                ƒ/${this.bgImage.exif!.aperture}
              </dd>
              <dd></dd>
              <dd>${this.bgImage.exif!.exposure_time}</dd>
              <dd>ISO ${this.bgImage.exif!.iso}</dd>
            </div>
            <div id="image-dimensions">
              <dt class="text-2xl text-gray-400">Dimensions</dt>
              <dd>${this.bgImage.width} × ${this.bgImage.height}</dd>
            </div>
          </div>

          <div class="mr-4">${cameraIcon}</div>

          <a
            @mouseover=${() => (this.showExif = true)}
            @mouseleave=${() => (this.showExif = false)}
            target="_blank"
            href="${this.bgImage.links
              .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
          >
            ${this.bgImage.exif?.model}
          </a>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'unsplash-info': UnsplashInfo;
  }
}
