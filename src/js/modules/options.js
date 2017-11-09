import purify from '../libs/purify-dom';
import { togglePopover, $, chainableClassList,
  removeChildElements as empty } from '../libs/helpers';
import initializeGeneralOptions from '../modules/general-options';
import initializeCloudOptions from '../modules/cloud-options';
import initializeWeatherOptions from '../modules/weather-options';
import initializeAddonInfo from '../modules/addon-options';
import optionsPopover from '../components/options-popover';

const loadOptionViews = () => {
  const viewControls = Array.from(
    document.querySelectorAll('.options-sidebar__item'));
  const activeControl = viewControls.filter(control =>
    control.classList.contains('active-option'));

  const activeOption = activeControl[0].dataset.option;

  const popoverView = $('popover-view');
  empty(popoverView);

  switch (activeOption) {
    case 'general': {
      initializeGeneralOptions();
      break;
    }

    case 'cloud': {
      initializeCloudOptions();
      break;
    }

    case 'weather': {
      initializeWeatherOptions();
      break;
    }

    case 'info': {
      initializeAddonInfo();
      break;
    }

    default: {
      initializeGeneralOptions();
    }
  }
};

const changeActiveOption = (e) => {
  const viewControls = document.querySelectorAll('.options-sidebar li');
  viewControls.forEach(control =>
    chainableClassList(control).remove('active-option'));

  e.target.classList.add('active-option');
  loadOptionViews();
};

const loadOptions = () => {
  const controls = document.querySelector('.controls');

  controls.insertAdjacentHTML('afterbegin', purify.sanitize(`
    ${optionsPopover()}
    
      `, { ADD_TAGS: ['use'] }));

  loadOptionViews();

  const optionsButton = $('options-button');
  optionsButton.addEventListener('click', () => {
    togglePopover('.options-popover');
  });

  const viewControls = document.querySelectorAll('.options-sidebar li');
  viewControls.forEach((control) => {
    control.addEventListener('click', changeActiveOption);
  });
};

export default loadOptions;
