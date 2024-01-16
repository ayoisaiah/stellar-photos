import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ChromeStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import './image-card';

@customElement('stellar-history')
class History extends LitElement {
  override createRenderRoot(): this {
    return this;
  }

  @property({ type: Object })
  // TODO: Proper way to do this?
  data!: ChromeStorage;

  @property({ type: Boolean })
  historyOpen!: Boolean;

  #placeHolder(length: number) {
    let placeholders = html``;

    while (length < 10) {
      placeholders = html`${placeholders}
        <div class="history-placeholder">
          <svg>
            <use href="#icon-image"></use>
          </svg>
        </div>`;
      length += 1;
    }

    return html;
  }

  override render() {
    return html`
      <ul class="s-history ${this.historyOpen ? 'open' : ''}" id="js-history">
        ${this.data.history?.map((photo: UnsplashImage) => {
          return html`<image-card
            .image=${photo}
            .cloudService=${this.data.cloudService!}
          ></image-card>`;
        })}
        ${this.#placeHolder(this.data.history?.length!)}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-history': History;
  }
}
