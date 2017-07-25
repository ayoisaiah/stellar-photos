const getCoords = () => {
  let coords;
  chrome.storage.sync.get('s-coords', (details) => {
    coords = details.coords;
  });

  if (coords) {
    localStorage.setItem('s-coords', JSON.stringify(coords));
    return Promise.resolve(coords);
  }

  if (navigator.geolocation) {
    let coords;
    navigator.geolocation.getCurrentPosition((position) => {
      const { longitude, latitude } = position.coords;
      const obj = {
        longitude,
        latitude,
      };
      chrome.storage.sync.set({
        's-coords': obj,
      }, () => {
        localStorage.setItem('s-coords', JSON.stringify(obj));
      });
      coords = obj;
    });
    return Promise.resolve(coords);
  }

  return Promise.reject(new Error('failed to get coords'));
};

const getWeatherInfo = (data) => {
  const coords = data || JSON.parse(localStorage.getItem('s-coords'));
  if (!coords) return;
  const { longitude, latitude } = coords;
  const tempUnit = localStorage.getItem('s-tempUnit') || 'celsius';
  const metricSystem = (tempUnit === 'fahrenheit') ? 'imperial' : 'metric';
  fetch(`https://stellar-photos.herokuapp.com/api/weather/${latitude},${longitude},${metricSystem}`)
    .then(response => response.json())
    .then((forecast) => {
      localStorage.setItem('s-weather', JSON.stringify(forecast));
    })
    .catch(error => console.log(error));
};

const fetchRandomPhoto = () => {
  fetch('https://stellar-photos.herokuapp.com/api/photos/random')
    .then(response => response.json())
    .then((data) => {
      localStorage.setItem('nextImage', JSON.stringify(data));
    });
};

const setBackgroundPhoto = () => {
  fetchRandomPhoto();

  if (!localStorage.getItem('s-coords')) {
    getCoords()
      .then(data => getWeatherInfo(data));
    return;
  }

  if (!localStorage.getItem('s-weather')) {
    getWeatherInfo();
    return;
  }

  const weatherData = JSON.parse(localStorage.getItem('s-weather'));
  const timestamp = weatherData.dt;

  if (timestamp) {
    const lessThanOneHourAgo = (ts) => {
      const twoHours = 2 * (1000 * 60 * 60);
      const twoHoursAgo = Date.now() - twoHours;
      return ts > twoHoursAgo;
    };

    if (!lessThanOneHourAgo()) {
      getWeatherInfo();
    }
  }
};

chrome.runtime.onInstalled.addListener(setBackgroundPhoto);
chrome.tabs.onCreated.addListener(setBackgroundPhoto);

chrome.runtime.onMessage.addListener((request, sender) => {
  switch (request.command) {
    case 'set-dropbox-token': {
      localStorage.setItem('dropbox-token', request.token);
      chrome.notifications.create('dropbox-notification', {
        type: 'basic',
        iconUrl: chrome.extension.getURL("icons/48.png"),
        title: 'Stellar Photos',
        message: 'Dropbox authenticated successfully',
      });
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
  }
});

chrome.runtime.onConnect.addListener((options) => {
  options.onDisconnect.addListener(() => {
    getWeatherInfo();
  });
});
