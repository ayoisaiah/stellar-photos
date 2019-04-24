import { html, render } from 'lit-html';
import { $, convertTimeStamp } from './libs/helpers';
import eventListeners from './libs/event-listeners';
import { initializeSearch } from './modules/search';
import { initializeHistory } from './modules/history';
import initializeOptions from './modules/options';
import main from './components/main';
import loader from './components/loader';
import footer from './components/footer';
import header from './components/header';
import settingsDialog from './components/settings-dialog';
import svgDefs from './components/svg';

import '../sass/main.scss';

const app = $('app');
window.stellar.nextImage.then(nextImage => {
  const fullDate = convertTimeStamp(
    Math.floor(new Date(`${nextImage.created_at}`).getTime() / 1000)
  ).fullDate;

  const body = html`
    ${loader()} ${settingsDialog()} ${header()} ${main()}
    ${footer(nextImage, fullDate)} ${svgDefs()}
  `;
  render(body, app);

  initializeOptions();

  initializeHistory();

  initializeSearch();

  eventListeners();
});
