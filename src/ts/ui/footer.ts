import { html, TemplateResult } from 'lit-html';
import { format } from 'timeago.js';
import { handleClick } from '../../js/libs/handle';
import { cloudButton } from '../../js/libs/cloud-button';
import { Forecast } from '../types/weather';
import { ChromeLocalStorage } from '../types';

/*
 * The footer component
 */

function togglePopover(): void {}

function weatherInfo(forecast: Forecast) {
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

function footer(data: ChromeLocalStorage): TemplateResult {
  const { nextImage, forecast } = data;

  return html`
    <footer class="s-ui s-footer hide-ui" id="s-footer">
      <div class="footer-content js-footer-content">
        ${forecast
          ? html`
              <section class="weather" id="footer-weather">
                ${weatherInfo(forecast)}
              </section>
            `
          : ''}
        <section id="unsplash-credit" class="unsplash-credit">
          <span
            >Photo by
            <a
              rel="noopener"
              href="${nextImage?.user.links
                .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
            >
              ${nextImage?.user.first_name || ''}
              ${nextImage?.user.last_name || ''}
            </a>
            on
            <a
              rel="noopener"
              href="${nextImage?.links
                .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
              >Unsplash</a
            >
          </span>
        </section>
        <section class="controls" id="footer-controls" @click=${handleClick}>
          <button
            data-imageid=${nextImage?.id}
            class="control-button download-button"
            title="Download photo"
          >
            <svg class="icon icon-download">
              <use href="#icon-download"></use>
            </svg>
          </button>

          ${cloudButton(nextImage)}

          <button
            @click=${togglePopover}
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
