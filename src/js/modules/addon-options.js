import { $ } from '../libs/helpers';
import purify from '../libs/purify-dom';
import addonInfoPopoverView from '../components/addon-info-popover-view';

/*
 * Loads the addon-info component into the DOM
 */

const initializeAddonInfo = () => {
  const popoverView = $('popover-view');
  popoverView.insertAdjacentHTML(
    'afterbegin',
    purify.sanitize(addonInfoPopoverView(), {
      ADD_TAGS: ['use'],
    })
  );
};

export default initializeAddonInfo;
