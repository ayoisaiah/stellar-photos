import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { toggleHistoryEvent } from './custom-events';

@customElement('hamburger-menu')
class Hamburger extends LitElement {
  override createRenderRoot(): this {
    return this;
  }

  @property({ type: Boolean })
  historyOpen!: Boolean;

  override render() {
    return html`
      <button
        class="historyButton historyButton-open ${this.historyOpen
          ? 'transform'
          : ''}"
        id="js-hamburger"
        @click=${() => this.dispatchEvent(toggleHistoryEvent)}
        title="toggle history menu"
        aria-label="Toggle History Menu"
      >
        <div>
          <i class="bar1"></i>
          <i class="bar2"></i>
          <i class="bar3"></i>
        </div>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hamburger-menu': Hamburger;
  }
}
