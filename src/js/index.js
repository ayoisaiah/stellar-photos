import { $ } from './libs/helpers';
import purify from './libs/purify-dom';
import eventListeners from './libs/event-listeners';
import { initializeSearch } from './modules/search';
import initializeHistory from './modules/history';
import initializeWeather from './modules/weather';
import loadOptions from './modules/options';
import loadNextImageDetails from './modules/load-next-image-details';
import main from './components/main';
import loader from './components/loader';
import footer from './components/footer';
import header from './components/header';

const body = $('app');
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

eventListeners();
