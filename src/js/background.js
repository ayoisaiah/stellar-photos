import getWeatherInfo from './libs/get-weather-info';
import fetchRandomPhoto from './libs/fetch-random-photo';
import loadNewData from './libs/load-new-data';


chrome.runtime.onInstalled.addListener(fetchRandomPhoto);
chrome.runtime.onMessage.addListener((request, sender) => {
  switch (request.command) {
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


chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'loadphoto') {
    fetchRandomPhoto();
    return;
  }

  if (alarm.name === 'loadweather') {
    chrome.runtime.sendMessage({ command: 'update-weather' });
  }
});
