import purify from '../libs/purify-dom';
import { handleClick } from '../libs/handle';
import { $ } from '../libs/helpers';
import cloudButton from '../libs/cloud-button';
import historyPane from '../components/history-pane';
import hamburgerMenu from '../components/hamburger-menu';
import photoCard from '../components/photo-card';

const toggleHistoryPane = () => {
  $('s-history').classList.toggle('open');
  $('s-footer').classList.toggle('history-open');
  $('historyButton').classList.toggle('transform');
};

const displayHistory = history => {
  const historyMenu = $('s-history');
  historyMenu.classList.remove('hidden');

  history.map(photo =>
    historyMenu.insertAdjacentHTML(
      'beforeend',
      purify.sanitize(photoCard(photo, cloudButton), { ADD_TAGS: ['use'] })
    )
  );
};

const initializeHistory = () => {
  const headerContent = $('header-content');
  headerContent.insertAdjacentHTML(
    'afterbegin',
    purify.sanitize(hamburgerMenu())
  );

  const main = document.querySelector('.s-main');
  main.insertAdjacentHTML(
    'beforeend',
    purify.sanitize(historyPane(), {
      SANITIZE_DOM: false,
    })
  );

  $('s-history').addEventListener('click', handleClick);

  const historyButton = $('historyButton');
  historyButton.addEventListener('click', toggleHistoryPane);

  chrome.storage.local.get('history', result => {
    const { history } = result;
    if (history) {
      displayHistory(history);
    }
  });
};

export default initializeHistory;
