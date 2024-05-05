import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import { toggleHistoryEvent } from './custom-events';
import { closeIcon, historyIcon } from './icons';

@customElement('history-button')
class HistoryButton extends LitElement {
  static override styles = [unsafeCSS(tailwind)];

  @property({ type: Boolean })
  historyOpen!: Boolean;

  override render() {
    return html`
      <button
        class="bg-transparent"
        id="history-button"
        @click=${() => this.dispatchEvent(toggleHistoryEvent)}
        title="${this.historyOpen ? 'Close' : 'Open'} history menu"
        aria-label="${this.historyOpen ? 'Close' : 'Open'} history menu"
      >
        ${this.historyOpen ? closeIcon : historyIcon}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'history-button': HistoryButton;
  }
}
