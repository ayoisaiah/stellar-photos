/**
 * Fetch a random phot from the server
 */

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

export default fetchRandomPhoto;
