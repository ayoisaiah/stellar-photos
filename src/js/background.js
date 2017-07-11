const getCoords = () => new Promise((resolve, reject) => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const { longitude, latitude } = position.coords;
      const obj = {
        longitude,
        latitude,
      };
      localStorage.setItem('s-coords', JSON.stringify(obj));
      resolve(obj);
    });
  } else {
    reject(new Error('failed to get coords'));
  }
});

const getWeatherInfo = (data) => {
  const coords = data || JSON.parse(localStorage.getItem('s-coords'));
  const { longitude, latitude } = coords;
  fetch(`http://localhost:3000/api/weather/${latitude},${longitude}`)
    .then(response => response.json())
    .then((forecast) => {
      console.log(forecast);
      localStorage.setItem('s-weather', JSON.stringify(forecast));
    })
    .catch(error => console.log(error));
};

const fetchRandomPhoto = () => {
  fetch('http://localhost:3000/api/photos/random')
    .then(response => response.json())
    .then((data) => {
      console.log(data);
      localStorage.setItem('nextImage', JSON.stringify(data));
    });
};


const init = () => {
  getCoords()
    .then(data => getWeatherInfo(data))
    .catch(error => console.log(error));
  fetchRandomPhoto();
};


const setBackgroundPhoto = () => {
  fetchRandomPhoto();
  if (!localStorage.getItem('s-coords')) {
    getCoords();
  }

  if (!localStorage.getItem('s-weather')) {
    getWeatherInfo();
  }

  const weatherData = JSON.parse(localStorage.getItem('s-weather'));
  const timestamp = weatherData.dt;

  if (timestamp) {
    const lessThanOneHourAgo = (timestamp) => {
      const twoHours = 2 * (1000 * 60 * 60);
      const twoHoursAgo = Date.now() - twoHours;
      return timestamp > twoHoursAgo;
    };

    if (!lessThanOneHourAgo()) {
      getWeatherInfo();
    }
  }
};

chrome.runtime.onInstalled.addListener(init);
chrome.tabs.onCreated.addListener(setBackgroundPhoto);

chrome.runtime.onMessage.addListener((request, sender) => {
  switch (request.command) {
    case 'set-dropbox-token': {
      localStorage.setItem('dropbox-token', request.token);
      chrome.notifications.create('dropbox-notification', {
        type: 'basic',
        title: 'Dropbox connected successfully',
      });
      break;
    }

    case 'close-tab': {
      chrome.tabs.remove(sender.tab.id);
      break;
    }
  }
});
