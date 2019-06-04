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

        chrome.storage.local.get(['history'], result => {
          const history = result.history || [];

          if (history.length >= 10) {
            history.pop();
          }

          history.unshift(nextImage);
          chrome.storage.local.set({ history });
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
