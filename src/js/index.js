import { html, render } from 'lit-html';
import { $, convertTimeStamp } from './libs/helpers';
import eventListeners from './libs/event-listeners';
import main from './components/main';
import loader from './components/loader';
import footer from './components/footer';
import header from './components/header';
import settingsDialog from './components/settings-dialog';
import svgDefs from './components/svg';

import '../sass/main.scss';

const app = $('app');
window.stellar.boot.then(data => {
  const { nextImage, history } = data;

  const fullDate = convertTimeStamp(
    Math.floor(new Date(`${nextImage.created_at}`).getTime() / 1000)
  ).fullDate;

  const body = html`
    ${loader()} ${settingsDialog(data)} ${header()} ${main(history)}
    ${footer(data, fullDate)} ${svgDefs()}
  `;
  render(body, app);

  eventListeners();
});
