import { saveToOneDrive } from './onedrive';
import { saveToDropbox } from './dropbox';
import { $ } from './helpers';
import loadingIndicator from './loading-indicator';
import { triggerPhotoDownload } from '../api';
import notifySnackbar from './notify-snackbar';

function handleDownload(imageid) {
  loadingIndicator().start();

  triggerPhotoDownload(imageid)
    .then((data) => {
      loadingIndicator().stop();
      const { url, id } = data;

      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `photo-${id}`);
      a.setAttribute('style', 'opacity: 0;');

      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    })
    .catch(() => {
      notifySnackbar('Download failed', 'error');
      loadingIndicator().stop();
    });
}

function fadeInBackground() {
  const overlay = $('js-overlay');
  if (overlay) {
    overlay.animate(
      [
        {
          opacity: 1,
        },
        {
          opacity: 0,
        },
      ],
      {
        duration: 500,
      }
    );
  }
}

async function setBackgroundFromHistory(imageid) {
  const localData = await chrome.storage.local.get();
  const arr = localData.history.filter((e) => e.id === imageid);
  const image = arr[0];

  $('body').style.backgroundImage = `url(${image.base64})`;
  fadeInBackground();

  // TODO: Update Image info
}

function handleClick(e) {
  if (!e.target.matches('button')) return;

  const { target } = e;
  const { imageid } = target.dataset;

  if (target.classList.contains('bg-button')) {
    setBackgroundFromHistory(imageid);
    return;
  }

  if (target.classList.contains('dropbox-button')) {
    saveToDropbox(imageid);
    return;
  }

  if (target.classList.contains('onedrive-button')) {
    saveToOneDrive(imageid);
    return;
  }

  if (target.classList.contains('download-button')) {
    handleDownload(imageid);
  }
}

export { handleClick, handleDownload };
