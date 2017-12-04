import { validateResponse } from '../libs/helpers';

/**
 * Fetch a random phot from the server
 */

const fetchRandomPhoto = () => {
  const sendRequest = (collections) => {
    fetch(`https://stellar-photos.herokuapp.com/api/photos/random/${collections}`)
      .then(validateResponse)
      .then((data) => {
        const nextImage = Object.assign({
          timestamp: Date.now(),
        }, data);

        localStorage.setItem('nextImage', JSON.stringify(nextImage));

        chrome.storage.local.get('history', (result) => {
          const history = result.history || [];

          if (history.length >= 10) {
            history.pop();
          }

          history.unshift(data);
          chrome.storage.local.set({ history });
        });

        chrome.storage.sync.get('photoFrequency', (result) => {
          const { photoFrequency } = result;

          if (photoFrequency === 'everyhour') {
            chrome.alarms.create('loadphoto', {
              periodInMinutes: 60,
            });
          }

          if (photoFrequency === 'everyday') {
            chrome.alarms.create('loadphoto', {
              periodInMinutes: 1440,
            });
          }
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

export default fetchRandomPhoto;
