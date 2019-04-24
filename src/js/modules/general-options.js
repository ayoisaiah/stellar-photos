import { $ } from '../libs/helpers';

/*
 * Handle General Options
 */

const initializeCollections = () => {
  chrome.storage.sync.get('imageSource', d => {
    const { imageSource } = d;

    if (imageSource) {
      const radio = $(`${imageSource}-collection`);
      radio.checked = true;

      if (imageSource === 'custom') {
        const customCollection = document.querySelector('.custom-collection');
        customCollection.classList.add('is-visible');
      }
    } else {
      chrome.storage.sync.set({ imageSource: 'official' });
    }
  });

  chrome.storage.sync.get('collections', d => {
    const { collections } = d;
    const collectionsInput = $('unsplash-collections__input');
    collectionsInput.value = collections;
  });
};

const initializePhotoFrequency = () => {
  chrome.storage.sync.get('photoFrequency', res => {
    const { photoFrequency } = res;

    if (photoFrequency) {
      const selectPhotoFrequency = $('select-photo-frequency');
      selectPhotoFrequency.value = photoFrequency;
    } else {
      chrome.storage.sync.set({ photoFrequency: 'newtab' });
    }
  });
};

const initializeGeneralOptions = () => {
  initializeCollections();

  initializePhotoFrequency();
};

export default initializeGeneralOptions;
