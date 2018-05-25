import purify from '../libs/purify-dom';
import {
  togglePopover,
  $,
  chainableClassList,
  removeChildElements as empty,
} from '../libs/helpers';
import initializeGeneralOptions from '../modules/general-options';
import initializeCloudOptions from '../modules/cloud-options';
import initializeWeatherOptions from '../modules/weather-options';
import initializeAddonInfo from '../modules/addon-options';
import optionsPopover from '../components/options-popover';

function loadOptionViews() {
  const activeOption = this.dataset.option;

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
}

function changeActiveOption() {
  const sidebarItems = document.getElementsByClassName(
    'js-options-sidebar__item'
  );
  Array.from(sidebarItems).forEach(item =>
    chainableClassList(item).remove('active-option')
  );

  this.classList.add('active-option');
  loadOptionViews.call(this);
}

function loadOptions() {
  const controls = $('footer-controls');

  controls.insertAdjacentHTML(
    'afterbegin',
    purify.sanitize(`${optionsPopover()}`, { ADD_TAGS: ['use'] })
  );

  initializeGeneralOptions();

  const optionsButton = document.getElementsByClassName('js-options-button')[0];
  optionsButton.addEventListener('click', togglePopover);

  const sidebarItems = document.getElementsByClassName(
    'js-options-sidebar__item'
  );
  Array.from(sidebarItems).forEach(item => {
    item.addEventListener('click', changeActiveOption);
  });
}

export default loadOptions;
