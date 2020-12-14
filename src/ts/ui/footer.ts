import { html, nothing, TemplateResult } from 'lit-html';
import { format } from 'timeago.js';
import { cloudButton } from './cloud-button';
import { Forecast } from '../types/weather';
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

function weatherInfo(forecast: Forecast): TemplateResult {
  const location = forecast.name;
  const temperature = Math.round(forecast.main.temp);
  const { description } = forecast.weather[0];
  const lastUpdatedTime = format(new Date(forecast.timestamp ?? Date.now()));

  return html`
    <span class="location">
      <svg class="icon location-icon"><use href="#icon-location"></use></svg>
      <span class="location-text">${location}</span>
    </span>
    <span class="temperature">
      <svg class="icon temperature-icon">
        <use href="#icon-temperature"></use>
      </svg>
      <span class="temperature-text">${temperature}° - ${description}</span>
    </span>
    <span class="last-updated">${lastUpdatedTime}</span>
  `;
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
  const { nextImage, forecast, cloudService } = data;

  return html`
    <footer
      @mouseenter=${fadeInControls}
      @mouseleave=${hideControls}
      class="s-ui s-footer"
      id="js-footer"
    >
      <div class="footer-content js-footer-content">
        ${forecast
          ? html`
              <section class="weather" id="footer-weather">
                ${weatherInfo(forecast)}
              </section>
            `
          : nothing}
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
