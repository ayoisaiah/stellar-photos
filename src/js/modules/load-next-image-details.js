import { convertTimeStamp, togglePopover, $ } from '../libs/helpers';
import purify from '../libs/purify-dom';
import { handleClick } from '../libs/handle';
import cloudButton from '../libs/cloud-button';
import downloadButton from '../components/download-button';
import infoPopover from '../components/info-popover';
import { triggerPhotoDownload } from '../api';
import loadingIndicator from '../libs/loading-indicator';

const loadNextImageDetails = () => {
  window.stellar.nextImage.then(nextImage => {
    const fullDate = convertTimeStamp(
      Math.floor(new Date(`${nextImage.created_at}`).getTime() / 1000)
    ).fullDate;

    const controls = $('footer-controls');

    controls.insertAdjacentHTML(
      'beforeend',
      purify.sanitize(
        `
        ${downloadButton(nextImage)}
        ${cloudButton(nextImage)}
        ${infoPopover(nextImage, fullDate)}
      `,
        { ADD_TAGS: ['use'] }
      )
    );
    controls.addEventListener('click', handleClick);

    const infoButton = document.querySelector('.info-button');
    infoButton.addEventListener('click', () => {
      togglePopover('.info-popover');
    });

    const downloadBtn = document.querySelector('.download-button');
    downloadBtn.addEventListener('click', () => {
      loadingIndicator().start();
      const { imageid } = downloadBtn.dataset;
      triggerPhotoDownload(imageid)
        .then(data => {
          loadingIndicator().stop();
          const { url } = data;
          const a = document.createElement('a');
          a.href = url;
          a.setAttribute('download', 'download');
          a.setAttribute('style', 'opacity: 0;');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        })
        .catch(() => {
          loadingIndicator().stop();
        });
    });
  });
};

export default loadNextImageDetails;
