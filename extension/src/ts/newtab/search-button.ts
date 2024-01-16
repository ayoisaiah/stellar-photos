import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { openSearchEvent } from './custom-events';

@customElement('search-button')
class SearchButton extends LitElement {
  override createRenderRoot(): this {
    return this;
  }

  override render() {
    return html`
      <button
        @click=${() => this.dispatchEvent(openSearchEvent)}
        title="Find free hi-res photos"
        id="js-open-search"
        class="searchButton searchButton-open"
        aria-label="Open search form"
      >
        <svg class="icon icon--search">
          <use href="#icon-search"></use>
        </svg>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'search-button': SearchButton;
  }
}
