import state from '../libs/state';
import observer from '../libs/observer';
import purify from '../libs/purify-dom';
import cloudButton from '../libs/cloud-button';
import photoCard from '../components/photo-card';

const displayPhotos = (photos, total) => {
  const searchResults = document.querySelector('.searchResults');

  photos.map(photo => searchResults.insertAdjacentHTML('beforeend',
    purify.sanitize(photoCard(photo, cloudButton), { ADD_TAGS: ['use'] })),
  );

  const loadMore = document.querySelector('.moreResults-button');

  if (state.results.length >= total) {
    loadMore.classList.add('hidden');
    observer.disconnect();
    return;
  }

  state.page += 1;
  loadMore.classList.remove('hidden');
};

export default displayPhotos;
