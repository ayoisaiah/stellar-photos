import getWeatherInfo from './get-weather-info';
import fetchRandomPhoto from './fetch-random-photo';

/*
 * Load the next image and update the weather
 */

const loadNewData = () => {
  chrome.storage.sync.get('photoFrequency', (result) => {
    const { photoFrequency } = result;
    if (photoFrequency === 'newtab') {
      fetchRandomPhoto();
    }
  });

  chrome.storage.local.get('forecast', (result) => {
    const { forecast } = result;

    chrome.storage.sync.get('coords', (d) => {
      const { coords } = d;

      if (!forecast && coords) {
        getWeatherInfo();
        return;
      }

      if (forecast) {
        const { timestamp } = forecast;
        if (timestamp) {
          const lessThanOneHourAgo = () => {
            const oneHour = 1000 * 60 * 60;
            const oneHourAgo = Date.now() - oneHour;
            return timestamp > oneHourAgo;
          };

          if (!lessThanOneHourAgo()) {
            getWeatherInfo();
          }
        }
      }
    });
  });
};

export default loadNewData;
