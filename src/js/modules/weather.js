import purify from '../libs/purify-dom';
import { $ } from '../libs/helpers';
import weatherInfo from '../components/weather-info';

/*
 * Loads the weather forecast into the DOM if available
 */

const initializeWeather = () => {
  const { forecast } = window;

  if (forecast) {
    const weatherArea = $('footer-weather');
    weatherArea.insertAdjacentHTML(
      'afterbegin',
      purify.sanitize(weatherInfo(forecast), { ADD_TAGS: ['use'] })
    );
  } else {
    const controls = document.getElementsByClassName('js-footer-content')[0];
    const weatherArea = $('footer-weather');
    const creditSection = $('unsplash-credit');

    controls.insertBefore(creditSection, weatherArea);
    creditSection.style.justifyContent = 'flex-start';
  }
};

export default initializeWeather;
