import { render } from 'lit-html';
import settingsDialog from './settings/index';
import { $, getChromeStorageData } from './helpers';

async function renderSettings(): Promise<void> {
  try {
    const data = await getChromeStorageData();

    const main = $('js-main');
    if (main) {
      render(settingsDialog(data), main);
    }
  } catch (err) {
    console.log(err);
  }
}

renderSettings();
