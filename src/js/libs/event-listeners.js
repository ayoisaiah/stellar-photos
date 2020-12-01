import { chainableClassList, $ } from './helpers';

const eventListeners = () => {
  const uiElements = document.querySelectorAll('.s-ui');

  const showControls = () => {
    uiElements.forEach((element) =>
      chainableClassList(element).remove('hide-ui')
    );
  };

  const hideControls = () => {
    // Check if one popover is active
    const popovers = Array.from(document.querySelectorAll('.popover-content'));
    const arePopoversOpen = popovers.some((e) =>
      e.classList.contains('popover-content--is-visible')
    );

    // Don't hide controls if any popover is open
    if (arePopoversOpen) return;

    // Also don't hide controls if history pane is open
    const historyPane = $('js-history');
    if (historyPane.classList.contains('open')) return;

    // Also don't hide controls if there is an active search
    const searchResults = $('js-search-results');
    if (searchResults.hasChildNodes()) return;

    uiElements.forEach((element) => chainableClassList(element).add('hide-ui'));
  };

  showControls();

  // Hide the buttons and bars after 2 seconds of inactivity

  let timeout = setTimeout(() => hideControls(), 2000);

  uiElements.forEach((element) => {
    element.addEventListener('mouseenter', () => {
      showControls();
      if (timeout) clearTimeout(timeout);
    });

    element.addEventListener('mouseleave', () => {
      timeout = setTimeout(() => hideControls(), 2000);
    });
  });
};

export default eventListeners;
