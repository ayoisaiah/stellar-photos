import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import { ChromeStorage } from '../types';
import './footer-controls';
import './unsplash-credit';
import './unsplash-info';

@customElement('stellar-footer')
class Footer extends LitElement {
  static override styles = [unsafeCSS(tailwind)];

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
      <footer
        class="${this.historyOpen
          ? '-translate-y-[150px]'
          : ''} fixed bottom-0 left-0 right-0 z-10 flex justify-between px-8 py-4 [transition:transform_.5s_cubic-bezier(.28,.83,.67,1)]"
      >
        <unsplash-info .bgImage=${this.data.nextImage!}></unsplash-info>
        <footer-controls
          .bgImage=${this.data.nextImage!}
          .imagePaused=${this.imagePaused}
          .cloudService=${this.data.cloudService!}
        ></footer-controls>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-footer': Footer;
  }
}
