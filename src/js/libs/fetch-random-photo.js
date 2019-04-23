import { getRandomPhoto } from '../api';

/**
 * Fetch a random photo from the server
 */

const fetchRandomPhoto = () => {
  const sendRequest = collections => {
    getRandomPhoto(collections)
      .then(data => {
        const nextImage = Object.assign(
          {
            timestamp: Date.now(),
          },
          data
        );

        chrome.storage.local.set({ nextImage });

        chrome.storage.local.get('history', result => {
          const history = result.history || [];

          if (history.length >= 10) {
            history.pop();
          }

          history.unshift(nextImage);
          chrome.storage.local.set({ history });
        });

        chrome.storage.sync.get('photoFrequency', result => {
          const { photoFrequency } = result;

          if (photoFrequency === 'every15minutes') {
            chrome.alarms.create('loadphoto', {
              periodInMinutes: 15,
            });
          }

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

  chrome.storage.sync.get('collections', result => {
    let { collections } = result;

    if (!collections) collections = '998309';

    chrome.storage.sync.set({ collections });

    sendRequest(collections);
  });
};

export default fetchRandomPhoto;
