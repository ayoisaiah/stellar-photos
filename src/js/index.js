import { html, render } from 'lit-html';
import { $, convertTimeStamp } from './libs/helpers';
import eventListeners from './libs/event-listeners';
import cloudButton from './libs/cloud-button';
import main from './components/main';
import loader from './components/loader';
import { footer } from './components/footer';
import header from './components/header';
import svgDefs from './components/svg';
import photoCard from './components/photo-card';

const app = $('app');
window.stellar.boot.then(data => {
  const { nextImage } = data;

  if (nextImage) {
    const fullDate = convertTimeStamp(
      Math.floor(new Date(`${nextImage.created_at}`).getTime() / 1000)
    ).fullDate;

    const body = html`
      ${loader()} ${header()} ${main()}
      ${footer(data, fullDate)} ${svgDefs()}
    `;
    render(body, app);

    chrome.storage.local.get('history', result => {
      const { history } = result;
      window.stellar.history = history;
      const h = html`
        ${history.map(photo => photoCard(photo, cloudButton))}
      `;
      const historyPane = $('s-history');
      render(h, historyPane);
    });

    eventListeners();
  }
});
