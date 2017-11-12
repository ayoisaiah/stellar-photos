import { convertTimeStamp, togglePopover, $ } from '../libs/helpers';
import purify from '../libs/purify-dom';
import { saveToDropbox } from '../libs/dropbox';
import downloadButton from '../components/download-button';
import dropboxButton from '../components/dropbox-button';
import infoPopover from '../components/info-popover';

const listen = () => {
  const dropboxIcon = $('dropbox-button');
  dropboxIcon.addEventListener('click', () => {
    const imageId = dropboxIcon.dataset.imageid;
    const downloadUrl = dropboxIcon.dataset.downloadurl;

    saveToDropbox(imageId, downloadUrl);
  });

  const infoButton = document.querySelector('.info-button');
  infoButton.addEventListener('click', () => {
    togglePopover('.info-popover');
  });
};

const loadNextImageDetails = () => {
  chrome.storage.local.get('nextImage', (result) => {
    const { nextImage } = result;
    if (nextImage) {
      const fullDate = convertTimeStamp(Math.floor(new Date(`${nextImage.created_at}`).getTime() / 1000)).fullDate;

      const controls = document.querySelector('.controls');

      controls.insertAdjacentHTML('beforeend', purify.sanitize(`
        ${downloadButton(nextImage)}
        ${dropboxButton(nextImage)}
        ${infoPopover(nextImage, fullDate)}
    
    
      `, { ADD_TAGS: ['use'] }));
    }

    listen();
  });
};

export default loadNextImageDetails;
