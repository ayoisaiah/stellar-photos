import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { UnsplashImage } from '../types/unsplash';

@customElement('unsplash-credit')
class UnsplashCredit extends LitElement {
  override createRenderRoot(): this {
    return this;
  }

  @property({ type: Object })
  // TODO: Proper way to do this?
  nextImage = <UnsplashImage>{};

  override render() {
    return html`
      <section class="unsplash-credit" id="unsplash-credit">
        <span>
          <svg class="icon icon-camera"><use href="#icon-camera"></use></svg>
          <a
            target="_blank"
            rel="noopener"
            href="${this.nextImage.user?.links
              .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
          >
            ${this.nextImage.user?.first_name || nothing}
            ${this.nextImage.user?.last_name || nothing}
          </a>
          ${this.nextImage.location?.title
            ? html`<span class="photo-location">
                <svg class="icon icon-location">
                  <use href="#icon-location"></use>
                </svg>
                <a
                  target="_blank"
                  rel="noopener"
                  href="${this.nextImage.links
                    ?.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
                  >${this.nextImage.location.title}</a
                ></span
              >`
            : nothing}
        </span>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'unsplash-credit': UnsplashCredit;
  }
}
