import getWeatherInfo from './get-weather-info';
import fetchRandomPhoto from './fetch-random-photo';
import { lessThanOneHourAgo, lessThan24HoursAgo } from './helpers';

/*
 * Load the next image and update the weather
 */

const loadNewData = () => {
  chrome.storage.sync.get('photoFrequency', result => {
    const { photoFrequency } = result;

    if (photoFrequency === 'newtab') {
      fetchRandomPhoto();
      return;
    }

    chrome.storage.local.get('nextImage', r => {
      const { nextImage } = r;

      if (
        photoFrequency === 'everyhour' &&
        !lessThanOneHourAgo(nextImage.timestamp)
      ) {
        fetchRandomPhoto();
        return;
      }

      if (
        photoFrequency === 'everyday' &&
        !lessThan24HoursAgo(nextImage.timestamp)
      ) {
        fetchRandomPhoto();
      }
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
          if (!lessThanOneHourAgo(timestamp)) {
            getWeatherInfo();
          }
        }
      }
    });
  });
};

export default loadNewData;
