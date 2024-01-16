import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ChromeStorage } from '../types';
import './footer-controls';
import './unsplash-credit';

@customElement('stellar-footer')
class Footer extends LitElement {
  override createRenderRoot(): this {
    return this;
  }

  @property({ type: Object })
  // TODO: Proper way to do this?
  data!: ChromeStorage;

  @property({ type: Boolean })
  // TODO: Proper way to do this?
  imagePaused = false;

  @property({ type: Boolean })
  historyOpen!: Boolean;

  override render() {
    return html`
      <div id="js-footer-container">
        <footer
          class="s-footer ${this.historyOpen ? 'history-open' : ''}"
          id="js-footer"
        >
          <div class="footer-content js-footer-content">
            <unsplash-credit
              .nextImage=${this.data.nextImage!}
            ></unsplash-credit>
            <footer-controls
              .nextImage=${this.data.nextImage!}
              .imagePaused=${this.imagePaused}
              .cloudService=${this.data.cloudService!}
            ></footer-controls>
          </div>
        </footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-footer': Footer;
  }
}
