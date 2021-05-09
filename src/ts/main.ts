import { render } from 'lit-html';
import { $, getChromeStorageData } from './helpers';
import { ui } from './ui';

async function paint() {
  try {
    const data = await getChromeStorageData();

    if (data.nextImage) {
      const app = $('js-app');
      if (app) render(ui(data), app);
    }
  } catch (err) {
    console.error(err);
  }
}

paint();
