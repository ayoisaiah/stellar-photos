import { ChromeStorage } from './types';
import { $ } from './helpers';

function loadCSS(url: string) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = resolve;
    link.onerror = reject;
    document.getElementsByTagName('head')[0]!.appendChild(link);
  });
}

function loadJS(url: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.getElementsByTagName('head')[0]!.appendChild(script);
  });
}

function getStorageData(): Promise<ChromeStorage> {
  return new Promise((resolve) => {
    chrome.storage.local.get((localData) => {
      chrome.storage.sync.get((syncData) => {
        resolve(Object.assign(syncData, localData));
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await getStorageData();

    const { nextImage } = data;

    if (nextImage) {
      const body = $('body');

      if (body && nextImage.base64) {
        body.style.backgroundImage = `url(${nextImage.base64})`;
      }
    }

    await loadCSS('css/main.css');
    await loadJS('js/main.bundle.js');
    await loadJS('js/events.bundle.js');
    chrome.runtime.sendMessage({ command: 'refresh' });
  } catch (err) {
    console.error(err);
  }
});
