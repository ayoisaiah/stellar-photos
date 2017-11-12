import { chainableClassList } from './libs/helpers';
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
  uiElements.forEach(element => chainableClassList(element).add('hide-ui'));
};

setTimeout(() => showControls(), 200);

// Hide the buttons and bars after 2 seconds of inactivity

let timeout;
document.addEventListener('mousemove', () => {
  showControls();
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => hideControls(), 2000);
});

// Close all popovers when click is detected outside
document.addEventListener('click', (node) => {
  if (node.target.matches('.popover *')) return;
  const popover = document.querySelectorAll('.popover .popover-content');
  popover.forEach(e => e.classList.remove('popover-content--is-visible'));
});
