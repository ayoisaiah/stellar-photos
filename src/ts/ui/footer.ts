import { html, nothing, TemplateResult } from 'lit-html';
import { cloudButton } from './cloud-button';
import { ChromeLocalStorage } from '../types';
import { $ } from '../helpers';
import { downloadButton } from './download';
import { UnsplashImage } from '../types/unsplash';
import { fadeInControls, hideControls } from './utils';

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
      <span
        >Photo by
        <a
          rel="noopener"
          href="${nextImage.user?.links
            .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
        >
          ${nextImage.user?.first_name || nothing}
          ${nextImage.user?.last_name || nothing}
        </a>
        on
        <a
          rel="noopener"
          href="${nextImage.links
            ?.html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
          >Unsplash</a
        >
      </span>
    </section>
  `;
}

function footer(data: ChromeLocalStorage): TemplateResult {
  const { nextImage, cloudService } = data;

  return html`
    <footer
      @mouseenter=${fadeInControls}
      @mouseleave=${hideControls}
      class="s-ui s-footer"
      id="js-footer"
    >
      <div class="footer-content js-footer-content">
        ${nextImage ? unsplashCredit(nextImage) : nothing}
        <section class="controls" id="footer-controls">
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
      </div>
    </footer>
  `;
}

export { footer };
