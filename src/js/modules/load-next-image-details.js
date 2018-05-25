import { convertTimeStamp, togglePopover, $ } from '../libs/helpers';
import purify from '../libs/purify-dom';
import { handleClick } from '../libs/handle';
import cloudButton from '../libs/cloud-button';
import downloadButton from '../components/download-button';
import infoPopover from '../components/info-popover';

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

    const infoButton = document.getElementsByClassName('js-info-button')[0];
    infoButton.addEventListener('click', togglePopover);
  });
};

export default loadNextImageDetails;
