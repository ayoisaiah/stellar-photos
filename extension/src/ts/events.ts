// import { render } from 'lit-html';
// import { loadHistory } from './ui';
// import { $, getFromChromeLocalStorage } from './helpers';
//
// async function updateHistory(): Promise<void> {
//   const localData = await getFromChromeLocalStorage(null);
//
//   if (localData.history) {
//     const history = $('js-history');
//     if (history)
//       render(loadHistory(localData.history, localData.cloudService), history);
//   }
// }
//
// chrome.runtime.onMessage.addListener((request) => {
//   switch (request.command) {
//     case 'update-history':
//       updateHistory();
//       break;
//   }
// });
