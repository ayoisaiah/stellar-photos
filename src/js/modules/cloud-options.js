import { $, removeChildElements as empty } from '../libs/helpers';
import purify from '../libs/purify-dom';
import { authorizeDropbox } from '../libs/dropbox';
import cloudPopoverView from '../components/cloud-popover-view';

const cloudStatus = (selectCloud) => {
  const selected = selectCloud[selectCloud.selectedIndex].value;
  const action = $('action');

  empty(action);

  chrome.storage.local.get(`${selected}`, (result) => {
    if (!result[`${selected}`]) {
      action.insertAdjacentHTML('beforeend',
        purify.sanitize(`<button class="authorize" 
          id="authorize">Authorize</button>`));

      const authorize = $('authorize');

      if (selected === 'dropboxToken') {
        authorize.addEventListener('click', () => {
          authorizeDropbox();
        });
      }
    } else {
      action.insertAdjacentHTML('beforeend',
        purify.sanitize('<span class="success-message">Authenticated</span>'));
    }
  });
};

const initializeCloudOptions = () => {
  const popoverView = $('popover-view');
  popoverView.insertAdjacentHTML('afterbegin',
    purify.sanitize(cloudPopoverView(), {
      SANITIZE_DOM: false,
    }));

  const selectCloud = $('select-cloud-storage');
  selectCloud.addEventListener('change', () => {
    cloudStatus(selectCloud);
  });

  cloudStatus(selectCloud);

  chrome.runtime.onMessage.addListener((request) => {
    switch (request.command) {
      case 'update-cloud-status': {
        cloudStatus(selectCloud);
        break;
      }
    }
  });
};

export default initializeCloudOptions;
