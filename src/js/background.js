const getWeatherInfo = () => {
  const sendRequest = (latitude, longitude, metricSystem) => {
    fetch(`https://stellar-photos.herokuapp.com/api/weather/${latitude},${longitude},${metricSystem}`)
      .then(response => response.json())
      .then((forecast) => {
        const f = Object.assign({
          timestamp: Date.now(),
        }, forecast);

        chrome.storage.local.set({ forecast: f });
      })
      .catch(error => console.log(error));
  };

  chrome.storage.sync.get('coords', (result) => {
    const { coords } = result;
    if (!coords) return;

    const { longitude, latitude } = coords;

    chrome.storage.sync.get('tempUnit', (data) => {
      const tempUnit = data.tempUnit || 'celsius';
      const metricSystem = (tempUnit === 'fahrenheit') ? 'imperial' : 'metric';
      sendRequest(latitude, longitude, metricSystem);
    });
  });
};

const fetchRandomPhoto = () => {
  const sendRequest = (collections) => {
    fetch(`https://stellar-photos.herokuapp.com/api/photos/random/${collections}`)
      .then(response => response.json())
      .then((data) => {
        chrome.storage.local.set({ nextImage: data });

        chrome.storage.local.get('history', (result) => {
          const history = result.history || [];

          if (history.length >= 10) {
            history.pop();
          }

          history.unshift(data);
          chrome.storage.local.set({ history });
        });
      })
      .catch(error => console.log(error));
  };

  chrome.storage.sync.get('collections', (result) => {
    let { collections } = result;

    if (!collections) collections = '998309';

    chrome.storage.sync.set({ collections });

    sendRequest(collections);
  });
};

const loadNewData = () => {
  fetchRandomPhoto();

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

chrome.runtime.onInstalled.addListener(fetchRandomPhoto);
chrome.runtime.onMessage.addListener((request, sender) => {
  switch (request.command) {
    case 'set-dropbox-token': {
      chrome.storage.local.set({ dropboxToken: request.token });

      chrome.notifications.create('dropbox-notification', {
        type: 'basic',
        iconUrl: chrome.extension.getURL('icons/48.png'),
        title: 'Dropbox authentication was successful',
        message: 'You can now save photos to your Dropbox!',
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
