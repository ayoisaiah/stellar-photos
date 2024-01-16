import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './hamburger';
import './search-button';

@customElement('stellar-header')
class Header extends LitElement {
  override createRenderRoot(): this {
    return this;
  }

  @property({ type: Boolean })
  historyOpen = false;

  override render() {
    return html`
      <header class="header" id="header">
        <div class="header-content" id="header-content">
          <hamburger-menu .historyOpen=${this.historyOpen}></hamburger-menu>
          <search-button></search-button>
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
