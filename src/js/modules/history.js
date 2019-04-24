import { html, render } from 'lit-html';
import { $ } from '../libs/helpers';
import cloudButton from '../libs/cloud-button';
import photoCard from '../components/photo-card';

const toggleHistoryPane = () => {
  $('s-history').classList.toggle('open');
  $('s-footer').classList.toggle('history-open');
  $('historyButton').classList.toggle('transform');
};

const displayHistory = history => {
  const historyPane = $('s-history');
  const h = html`
    ${history.map(photo => photoCard(photo, cloudButton))}
  `;
  render(h, historyPane);
};

const initializeHistory = () => {
  chrome.storage.local.get('history', result => {
    const { history } = result;
    if (history) {
      displayHistory(history);
    }
  });
};

export { initializeHistory, toggleHistoryPane };
