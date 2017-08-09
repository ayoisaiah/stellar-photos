const getWeatherInfo = () => {
  const coords = JSON.parse(localStorage.getItem('s-coords'));
  if (!coords) return;
  const { longitude, latitude } = coords;
  const tempUnit = localStorage.getItem('s-tempUnit') || 'celsius';
  const metricSystem = (tempUnit === 'fahrenheit') ? 'imperial' : 'metric';

  fetch(`https://stellar-photos.herokuapp.com/api/weather/${latitude},${longitude},${metricSystem}`)
    .then(response => response.json())
    .then((forecast) => {
      const f = Object.assign({
        timestamp: Date.now(),
      }, forecast);
      localStorage.setItem('s-weather', JSON.stringify(f));
    })
    .catch(error => console.log(error));
};

const fetchRandomPhoto = () => {
  fetch('https://stellar-photos.herokuapp.com/api/photos/random')
    .then(response => response.json())
    .then((data) => {
      localStorage.setItem('nextImage', JSON.stringify(data));
      const history = JSON.parse(localStorage.getItem('s-history')) || [];
      if (history.length >= 10) {
        history.pop();
      }
      history.unshift(data);
      localStorage.setItem('s-history', JSON.stringify(history));
    });
};

const loadNewData = () => {
  fetchRandomPhoto();

  if (!localStorage.getItem('s-weather') && localStorage.getItem('s-coords')) {
    getWeatherInfo();
    return;
  }

  if (localStorage.getItem('s-weather')) {
    const weatherData = JSON.parse(localStorage.getItem('s-weather'));
    const { timestamp } = weatherData;

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
};

chrome.runtime.onInstalled.addListener(fetchRandomPhoto);

chrome.runtime.onMessage.addListener((request, sender) => {
  switch (request.command) {
    case 'set-dropbox-token': {
      localStorage.setItem('dropbox-token', request.token);
      chrome.notifications.create('dropbox-notification', {
        type: 'basic',
        iconUrl: chrome.extension.getURL('icons/48.png'),
        title: 'Stellar Photos',
        message: 'Dropbox authenticated successfully',
      });
      chrome.runtime.sendMessage({ command: 'update-cloud-status' });
      break;
    }

    case 'close-tab': {
      chrome.tabs.remove(sender.tab.id);
      break;
    }

    case 'update-weather': {
      getWeatherInfo();
      break;
    }

    case 'load-data': {
      loadNewData();
    }
  }
});
