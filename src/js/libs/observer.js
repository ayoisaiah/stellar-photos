import state from './state';
import { searchPhotos } from '../modules/search';

const options = {
  // If user scrolls within 1200px of the `More Photos` button, request next page
  rootMargin: '1200px 0px',
  threshold: 1.0,
};

const loadMoreResults = entries => {
  entries.forEach(entry => {
    // If new search or if ongoing search
    if (state.page === 1 || state.isLoading) return;

    // If transitioning to a state of intersection
    if (entry.isIntersecting) {
      searchPhotos(state.searchKey, state.page);
    }
  });
};

const observer = new IntersectionObserver(loadMoreResults, options);

export default observer;
