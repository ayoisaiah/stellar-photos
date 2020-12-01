import 'chrome-extension-async';
import { ChromeLocalStorage } from './types';
import { $ } from './helpers';
import { UnsplashImage } from './types/unsplash';

async function getNextImage(): Promise<UnsplashImage> {
  const data: ChromeLocalStorage = await chrome.storage.local.get([
    'nextImage',
  ]);

  if (data.nextImage) {
    return data.nextImage;
  }

  throw Error('Next image is undefined');
}

function loadCSS(url: string) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = resolve;
    link.onerror = reject;
    document.getElementsByTagName('head')[0].appendChild(link);
  });
}

function loadJS(url: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.getElementsByTagName('head')[0].appendChild(script);
  });
}

async function loadControls() {
  document.removeEventListener('mousemove', loadControls);
  document.removeEventListener('focus', loadControls);

  try {
    // CSS first to avoid flash of unstyled content
    await loadCSS('css/main.css');
    await loadJS('js/main.bundle.js');
  } catch (err) {
    // eslint-disable-next-line
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const nextImage = await getNextImage();

    if (nextImage) {
      const body = $('body');

      if (body && nextImage.base64) {
        body.style.backgroundImage = `url(${nextImage.base64})`;
      }
    }

    chrome.runtime.sendMessage({ command: 'refresh' });

    document.addEventListener('mousemove', loadControls);
    document.addEventListener('focus', loadControls);
  } catch (err) {
    // eslint-disable-next-line
    console.error(err);
  }
});
