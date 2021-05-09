import { render } from 'lit-html';
import settingsDialog from './settings/index';
import { $, getChromeStorageData } from './helpers';

async function renderSettings(): Promise<void> {
  try {
    const data = await getChromeStorageData();

    const body = $('js-body');
    if (body) {
      render(settingsDialog(data), body);
    }
  } catch (err) {
    console.log(err);
  }
}

renderSettings();
