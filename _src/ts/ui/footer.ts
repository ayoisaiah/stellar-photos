import { html, nothing, TemplateResult } from 'lit-html';
import { cloudButton } from './cloud-button';
import { ChromeLocalStorage } from '../types';
import { $ } from '../helpers';
import { downloadButton } from './download';
import { UnsplashImage } from '../types/unsplash';

/*
 * The footer component
 */

function openDialog(): void {
  const dialog = $('js-dialog');
  if (dialog) {
    dialog.classList.add('is-open');
  }
}

function unsplashCredit(nextImage: UnsplashImage): TemplateResult {
  return html`
    <section id="unsplash-credit" class="unsplash-credit">
      <span>
        <svg class="icon icon-camera"><use href="#icon-camera"></use></svg>
        <a
          target="_blank"
          rel="noopener"
          href="${nextImage.user?.links
            .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
        >
          ${nextImage.user?.first_name || nothing}
          ${nextImage.user?.last_name || nothing}
        </a>
        ${nextImage.location?.title
          ? html`<span class="photo-location">
              <svg class="icon icon-location">
                <use href="#icon-location"></use>
              </svg>
              <a
                target="_blank"
                rel="noopener"
                href="${nextImage.links
                  ?.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
                >${nextImage.location.title}</a
              ></span
            >`
          : nothing}
      </span>
    </section>
  `;
}

function unpauseImage(this: HTMLButtonElement) {
  chrome.storage.local.set({ imagePaused: false });
  chrome.runtime.sendMessage({ command: 'refresh' });
  this.classList.add('is-hidden');
}

function footerControls(data: ChromeLocalStorage): TemplateResult {
  const { nextImage, cloudService, imagePaused } = data;
  return html`
    <section class="controls" id="footer-controls">
      <button
        title="Background image has been paused. Click to unpause"
        target="_blank"
        rel="noopener"
        @click=${unpauseImage}
        id="js-play-button"
        class="${imagePaused
          ? ''
          : 'is-hidden'} control-button unsplash-button js-play-button"
      >
        <svg class="icon icon-play">
          <use href="#icon-play"></use>
        </svg>
      </button>
      ${nextImage
        ? html`
            <a
              title="View image on Unsplash"
              href="${nextImage.links
                .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
              target="_blank"
              rel="noopener"
              class="control-button unsplash-button js-info-button"
            >
              <svg class="icon icon-anchor">
                <use href="#icon-anchor"></use>
              </svg>
            </a>
          `
        : nothing}
      ${nextImage ? downloadButton(nextImage) : nothing}
      ${nextImage && cloudService
        ? cloudButton(nextImage, cloudService)
        : nothing}

      <button
        @click=${openDialog}
        title="Photo info"
        class="control-button info-button js-info-button"
      >
        <svg class="icon icon-info"><use href="#icon-info"></use></svg>
      </button>
    </section>
  `;
}

function footer(data: ChromeLocalStorage): TemplateResult {
  const { nextImage } = data;

  return html`
    <footer class="s-ui s-footer" id="js-footer">
      <div class="footer-content js-footer-content">
        ${nextImage ? unsplashCredit(nextImage) : nothing}
        ${nextImage ? footerControls(data) : nothing}
      </div>
    </footer>
  `;
}

export { footer };
