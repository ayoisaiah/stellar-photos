import purify from '../libs/purify-dom';
import { $ } from '../libs/helpers';
import weatherInfo from '../components/weather-info';

/*
 * Loads the weather forecast into the DOM if available
 */

const initializeWeather = () => {
  chrome.storage.local.get('forecast', (result) => {
    const { forecast } = result;
    const weatherArea = $('footer-weather');

    if (forecast) {
      weatherArea.insertAdjacentHTML('afterbegin',
        purify.sanitize(weatherInfo(forecast), { ADD_TAGS: ['use'] }));
    }
  });
};

export default initializeWeather;
