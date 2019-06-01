import getWeatherInfo from './get-weather-info';
import fetchRandomPhoto from './fetch-random-photo';
import { lessThanTimeAgo } from './helpers';

/*
 * Load the next image and update the weather
 */

const loadNewData = () => {
  chrome.storage.sync.get('photoFrequency', result => {
    const { photoFrequency } = result;

    if (photoFrequency === 'paused') return;

    if (photoFrequency === 'newtab') {
      fetchRandomPhoto();
      return;
    }

    chrome.storage.local.get('nextImage', r => {
      const { nextImage } = r;

      if (
        photoFrequency === 'every15minutes' &&
        !lessThanTimeAgo(nextImage.timestamp, 900)
      )
        return fetchRandomPhoto();

      if (
        photoFrequency === 'everyhour' &&
        !lessThanTimeAgo(nextImage.timestamp, 3600)
      )
        return fetchRandomPhoto();

      if (
        photoFrequency === 'everyday' &&
        !lessThanTimeAgo(nextImage.timestamp, 86400)
      )
        return fetchRandomPhoto();
    });
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
