import { $ } from '../helpers';

let timeout: number;

function fadeOutControls(): void {
  // Don't hide controls if history pane is open
  const historyPane = $('js-history');
  if (historyPane && historyPane.classList.contains('open')) return;

  // Don't hide controls if there is an active search
  const searchResults = $('js-search-results');
  if (searchResults && searchResults.hasChildNodes()) return;

  // Don't hide controls if image info dialog is active
  const imageInfo = $('js-dialog');
  if (imageInfo && imageInfo.classList.contains('is-open')) return;

  const uiElements = document.querySelectorAll('.s-ui');
  uiElements.forEach((element) => {
    element.classList.remove('show');
  });
}

function fadeInControls(): void {
  if (timeout) clearTimeout(timeout);
  const uiElements = document.querySelectorAll('.s-ui');
  uiElements.forEach((element) => {
    element.classList.add('show');
  });
}

function hideControls(): void {
  timeout = window.setTimeout(() => fadeOutControls(), 2000);
}

export { fadeInControls, hideControls };
