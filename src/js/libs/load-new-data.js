import getWeatherInfo from './get-weather-info';
import fetchRandomPhoto from './fetch-random-photo';
import { lessThanTimeAgo } from './helpers';

/*
 * Load the next image and update the weather
 */

const loadNewData = () => {
  chrome.storage.local.get(['photoFrequency', 'nextImage'], result => {
    const { photoFrequency, nextImage } = result;

    if (photoFrequency === 'paused') return;

    if (photoFrequency === 'newtab') {
      fetchRandomPhoto();
      return;
    }

    if (
      photoFrequency === 'every15minutes' &&
      !lessThanTimeAgo(nextImage.timestamp, 900)
    ) {
      fetchRandomPhoto();
      return;
    }

    if (
      photoFrequency === 'everyhour' &&
      !lessThanTimeAgo(nextImage.timestamp, 3600)
    ) {
      fetchRandomPhoto();
      return;
    }

    if (
      photoFrequency === 'everyday' &&
      !lessThanTimeAgo(nextImage.timestamp, 86400)
    ) {
      fetchRandomPhoto();
    }
  });

  chrome.storage.local.get('forecast', result => {
    const { forecast } = result;
    chrome.storage.sync.get('coords', d => {
      const { coords } = d;

      if (!forecast && coords) {
        getWeatherInfo();
        return;
      }

      if (forecast) {
        const { timestamp } = forecast;
        if (timestamp) {
          if (!lessThanTimeAgo(timestamp, 3600)) {
            getWeatherInfo();
          }
        }
      }
    });
  });
};

export default loadNewData;
