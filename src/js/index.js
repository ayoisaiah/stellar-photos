import { chainableClassList } from './libs/helpers';
import purify from './libs/purify-dom';
import { initializeSearch } from './modules/search';
import initializeHistory from './modules/history';
import loadOptions from './modules/options';
import loadNextImage from './modules/load-next-image';
import weatherInfo from './components/weather-info';
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

loadNextImage();

loadOptions();

initializeHistory();

initializeSearch();

chrome.storage.local.get('forecast', (result) => {
  const { forecast } = result;
  const weatherArea = document.getElementById('s-footer .weather');

  if (forecast) {
    weatherArea.insertAdjacentHTML('afterbegin',
      purify.sanitize(weatherInfo(forecast), { ADD_TAGS: ['use'] }));
  }
});


const uiElements = document.querySelectorAll('.s-ui');
uiElements.forEach(element => chainableClassList(element).remove('hidden'));


document.addEventListener('click', (node) => {
  if (node.target.matches('.popover *')) return;
  const popover = document.querySelectorAll('.popover .popover-content');
  popover.forEach(e => e.classList.remove('popover-content--is-visible'));
});
