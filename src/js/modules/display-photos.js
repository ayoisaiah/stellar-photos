import { html, render } from 'lit-html';
import { searchState } from '../modules/search';
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

  if (searchState.results.length >= total) {
    loadMore.classList.add('hidden');
    observer.disconnect();
    return;
  }

  searchState.page += 1;
  loadMore.classList.remove('hidden');
};

export default displayPhotos;
