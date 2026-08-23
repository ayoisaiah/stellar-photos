import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import './history-button';

@customElement('stellar-header')
class Header extends LitElement {
  static override styles = [unsafeCSS(tailwind)];

  @property({ type: Boolean })
  historyOpen = false;

  override render() {
    return html`
      <header
        class="fixed left-0 right-0 top-0 z-10 flex justify-between px-8 py-4 text-white"
        id="header"
      >
        <span class="text-3xl">Stellar Photos</span>
        <div class="flex items-center">
          <history-button .historyOpen=${this.historyOpen}></history-button>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-header': Header;
  }
}
