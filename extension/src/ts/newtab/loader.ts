import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('stellar-loader')
class StellarLoader extends LitElement {
  static override styles = css`
    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }

      50% {
        transform: rotate(180deg);
      }

      100% {
        transform: rotate(360deg);
      }
    }

    .loader {
      position: fixed;
      top: 0;
      right: 0;
      transform: translateX(100%) translateY(-100%) rotate(45deg);
      z-index: 10000;
      transition: transform 0.3s;
      background: #b1d076;
      width: 300px;
      height: 300px;
    }

    .loader-active {
      transform: translateX(50%) translateY(-50%) rotate(45deg) !important;
    }

    .loader::before,
    .loader::after {
      display: block;
      position: absolute;
      bottom: 30px;
      left: 50%;
      border-width: 5px;
      border-style: solid;
      border-top-color: #2f2d2e;
      border-right-color: #97c149;
      border-bottom-color: #2f2d2e;
      border-left-color: #97c149;
      border-radius: 50%;
      content: '';
    }

    .loader::before {
      animation: rotation 3s linear infinite;
      margin-left: -40px;
      width: 80px;
      height: 80px;
    }

    .loader::after {
      bottom: 50px;
      animation: rotation 1s linear infinite;
      margin-left: -20px;
      width: 40px;
      height: 40px;
    }
  `;

  @property({ type: Boolean })
  active = false;

  override render() {
    return html`
      <div class="loader ${this.active ? 'loader-active' : ''}"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-loader': StellarLoader;
  }
}
