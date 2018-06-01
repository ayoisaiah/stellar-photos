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
      .catch(error => console.log(error));
  };

  chrome.storage.sync.get('coords', result => {
    const { coords } = result;
    if (!coords) return;

    const { longitude, latitude } = coords;

    chrome.storage.sync.get('tempUnit', data => {
      const tempUnit = data.tempUnit || 'celsius';
      const metricSystem = tempUnit === 'fahrenheit' ? 'imperial' : 'metric';
      sendRequest(latitude, longitude, metricSystem);
    });
  });
};

export default getWeatherInfo;
