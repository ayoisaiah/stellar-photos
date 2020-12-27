import { render } from 'lit-html';
import 'chrome-extension-async';
import { loadHistory } from './ui';
import { ChromeLocalStorage } from './types';
import { $ } from './helpers';

async function updateHistory(): Promise<void> {
  const localData: ChromeLocalStorage = await chrome.storage.local.get();

  if (localData.history) {
    const history = $('js-history');
    if (history)
      render(loadHistory(localData.history, localData.cloudService), history);
  }
}

chrome.runtime.onMessage.addListener((request) => {
  switch (request.command) {
    case 'update-history':
      updateHistory();
      break;
  }
});
