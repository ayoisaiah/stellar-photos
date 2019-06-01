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

        chrome.storage.local.get(['history', 'photoFrequency'], result => {
          const history = result.history || [];

          if (history.length >= 10) {
            history.pop();
          }

          history.unshift(nextImage);
          chrome.storage.local.set({ history });

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
      .catch(console.error);
  };

  chrome.storage.sync.get('imageSource', result => {
    let collections = '998309';

    if (result.imageSource === 'custom') {
      return chrome.storage.sync.get('collections', r => {
        collections = r.collections;
        sendRequest(collections);
      });
    }

    return sendRequest(collections);
  });
};

export default fetchRandomPhoto;
