import { chainableClassList, $ } from './libs/helpers';
import purify from './libs/purify-dom';
import { initializeSearch } from './modules/search';
import initializeHistory from './modules/history';
import initializeWeather from './modules/weather';
import loadOptions from './modules/options';
import loadNextImageDetails from './modules/load-next-image-details';
import main from './components/main';
import loader from './components/loader';
import footer from './components/footer';
import header from './components/header';


const body = document.getElementById('app');
body.insertAdjacentHTML('afterbegin', purify.sanitize(`
    ${loader()}
    ${header()}
    ${main()}
    ${footer()}
  `));

loadNextImageDetails();

loadOptions();

initializeHistory();

initializeSearch();

initializeWeather();

const uiElements = document.querySelectorAll('.s-ui');

const showControls = () => {
  uiElements.forEach(element => chainableClassList(element).remove('hide-ui'));
};

const hideControls = () => {
  // Check if one popover is active
  const popovers = Array.from(document.querySelectorAll('.popover-content'));
  const arePopoversOpen = popovers.some(e => e.classList
    .contains('popover-content--is-visible'));

  // Don't hide controls if any popover is open
  if (arePopoversOpen) return;

  // Also don't hide controls if history pane is open
  const historyPane = $('s-history');
  if (historyPane.classList.contains('open')) return;

  uiElements.forEach(element => chainableClassList(element).add('hide-ui'));
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

// Close all popovers when click is detected outside
document.addEventListener('click', (node) => {
  if (node.target.matches('.popover *')) return;
  const popover = document.querySelectorAll('.popover .popover-content');
  popover.forEach(e => e.classList.remove('popover-content--is-visible'));
});
