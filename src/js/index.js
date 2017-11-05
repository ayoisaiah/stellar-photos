import { chainableClassList } from './libs/helpers';
import purify from './libs/purify-dom';
import { initializeSearch } from './modules/search';
import initializeHistory from './modules/history';
import { loadOptions } from './modules/options';
import loadFooter from './modules/load-footer';
import loadNextImage from './modules/load-next-image';
import weatherInfo from './components/weather-info';
import loader from './components/loader';


const body = document.querySelector('body');
body.insertAdjacentHTML('afterbegin', purify.sanitize(`${loader()}`));

loadFooter();

loadNextImage();

loadOptions();

initializeHistory();

initializeSearch();

chrome.storage.local.get('forecast', (result) => {
  const { forecast } = result;

  if (forecast) {
    const footer = document.querySelector('.s-footer');
    footer.insertAdjacentHTML('afterbegin',
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
