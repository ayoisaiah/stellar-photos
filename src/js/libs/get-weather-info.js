import { getForecast } from '../api';

/*
 * Fetch current weather information
 */

const getWeatherInfo = () => {
  const sendRequest = (latitude, longitude, metricSystem) => {
    getForecast(latitude, longitude, metricSystem)
      .then(forecast => {
        const f = Object.assign(
          {
            timestamp: Date.now(),
          },
          forecast
        );

        chrome.storage.local.set({ forecast: f });

        chrome.alarms.create('loadweather', {
          periodInMinutes: 60,
        });
      })
      .catch(console.error);
  };

  chrome.storage.sync.get('coords', result => {
    const { coords } = result;
    if (!coords) return;

    const { longitude, latitude } = coords;

    if (longitude && latitude) {
      chrome.storage.sync.get('temperatureFormat', data => {
        const temperatureFormat = data.temperatureFormat || 'metric';
        sendRequest(latitude, longitude, temperatureFormat);
      });
    }
  });
};

export default getWeatherInfo;
