import { html } from 'lit-html';
import { handleClick } from '../libs/handle';
import infoButton from './info-button';
import cloudButton from '../libs/cloud-button';
import settingsButton from './settings-button';
import downloadButton from './download-button';
import unsplashCredit from './unsplash-credit';
import weatherInfo from './weather-info';
import infoPopover from './info-popover';

/*
 * The footer component
 */

const footerContent = (nextImage, date) => html`
  <div class="footer-content js-footer-content">
    ${window.forecast
      ? html`
          <section class="weather" id="footer-weather">
            ${weatherInfo(window.forecast)}
          </section>
        `
      : ''}
    <section id="unsplash-credit" class="unsplash-credit">
      ${unsplashCredit(nextImage)}
    </section>
    <section class="controls" id="footer-controls" @click=${handleClick}>
      ${settingsButton()} ${downloadButton(nextImage)} ${cloudButton(nextImage)}
      ${infoButton()} ${infoPopover(nextImage, date)}
    </section>
  </div>
`;

const footer = (data, date) => {
  const { nextImage } = data;

  return html`
    <footer class="s-ui s-footer hide-ui" id="s-footer">
      ${footerContent(nextImage, date)}
    </footer>
  `;
};

export { footer, footerContent };
