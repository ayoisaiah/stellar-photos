import purify from '../libs/purify-dom';
import { handleClick } from '../libs/handle';
import historyPane from '../components/history-pane';
import hamburgerMenu from '../components/hamburger-menu';
import photoCard from '../components/photo-card';

const toggleHistoryPane = () => {
  document.getElementById('s-history').classList.toggle('open');
  document.getElementById('s-footer').classList.toggle('history-open');
  document.getElementById('historyButton').classList.toggle('transform');
};

const displayHistory = (history) => {
  const historyMenu = document.getElementById('s-history');
  historyMenu.classList.remove('hidden');

  history.map(photo => historyMenu.insertAdjacentHTML('beforeend',
    purify.sanitize(photoCard(photo), { ADD_TAGS: ['use'] },
    )),
  );
};

const initializeHistory = () => {
  chrome.storage.local.get('history', (result) => {
    const { history } = result;
    if (history) {
      const main = document.querySelector('.s-main');
      main.insertAdjacentHTML('beforeend',
        purify.sanitize(`${historyPane()} ${hamburgerMenu()}`, {
          SANITIZE_DOM: false,
        }));

      document.getElementById('s-history')
        .addEventListener('click', handleClick);

      const historyButton = document.getElementById('historyButton');
      historyButton.addEventListener('click', toggleHistoryPane);
      historyButton.classList.remove('hidden');
      displayHistory(history);
    }
  });
};

export default initializeHistory;
