import getWeatherInfo from './get-weather-info';
import fetchRandomPhoto from './fetch-random-photo';
import { lessThanOneHourAgo, lessThan24HoursAgo } from './helpers';

/*
 * Load the next image and update the weather
 */

const loadNewData = () => {
  chrome.storage.sync.get('photoFrequency', (result) => {
    const { photoFrequency } = result;

    if (photoFrequency === 'newtab') {
      fetchRandomPhoto();
      return;
    }

    const nextImage = JSON.parse(localStorage.getItem('nextImage'));

    if (photoFrequency === 'everyhour'
      && !(lessThanOneHourAgo(nextImage.timestamp))) {
      fetchRandomPhoto();
      return;
    }

    if (photoFrequency === 'everyday'
      && !(lessThan24HoursAgo(nextImage.timestamp))) {
      fetchRandomPhoto();
    }
  });

  const forecast = JSON.parse(localStorage.getItem('weather-forecast'));

  chrome.storage.sync.get('coords', (d) => {
    const { coords } = d;

    if (!forecast && coords) {
      getWeatherInfo();
      return;
    }

    if (forecast) {
      const { timestamp } = forecast;
      if (timestamp) {
        if (!lessThanOneHourAgo(timestamp)) {
          getWeatherInfo();
        }
      }
    }
  });
};

export default loadNewData;
