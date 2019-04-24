import { html, render } from 'lit-html';
import state from '../libs/state';
import observer from '../libs/observer';
import cloudButton from '../libs/cloud-button';
import { $ } from '../libs/helpers';
import photoCard from '../components/photo-card';

const displayPhotos = (photos, total) => {
  const searchResults = $('searchResults');
  const h = html`
    ${photos.map(photo => photoCard(photo, cloudButton))}
  `;
  render(h, searchResults);

  const loadMore = $('moreResults-button');

  if (state.results.length >= total) {
    loadMore.classList.add('hidden');
    observer.disconnect();
    return;
  }

  state.page += 1;
  loadMore.classList.remove('hidden');
};

export default displayPhotos;
