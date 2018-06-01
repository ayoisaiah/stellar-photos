import { $, removeChildElements as empty } from '../libs/helpers';
import purify from '../libs/purify-dom';
import { authorizeDropbox } from '../libs/dropbox';
import { authorizeOneDrive } from '../libs/onedrive';
import cloudPopoverView from '../components/cloud-popover-view';

/**
 *
 * Handles options related to syncing photos to supported cloud services
 */

const updateCloudStatus = selected => {
  const action = $('action');
  empty(action);

  if (selected === 'noneselected') return;

  chrome.storage.local.set({ cloudService: selected });

  chrome.storage.local.get(selected, result => {
    const token = result[selected];
    if (!token) {
      action.insertAdjacentHTML(
        'beforeend',
        purify.sanitize(`<button class="authorize"
        id="authorize">Authorize</button>`)
      );

      const authorize = $('authorize');

      if (selected === 'dropbox') {
        authorize.addEventListener('click', () => {
          authorizeDropbox();
        });
      }

      if (selected === 'onedrive') {
        authorize.addEventListener('click', () => {
          authorizeOneDrive();
        });
      }
    } else {
      action.insertAdjacentHTML(
        'beforeend',
        purify.sanitize('<span class="success-message">Authenticated</span>')
      );
    }
  });
};

const selectCloudService = () => {
  const selectCloud = $('select-cloud-storage');

  selectCloud.addEventListener('change', () => {
    const selected = selectCloud[selectCloud.selectedIndex].value;
    updateCloudStatus(selected);
  });

  const selected = selectCloud[selectCloud.selectedIndex].value;

  chrome.runtime.onMessage.addListener(request => {
    if (request.command === 'update-cloud-status') {
      updateCloudStatus(selected);
    }
  });
};

const initializeCloudOptions = () => {
  const popoverView = $('popover-view');
  popoverView.insertAdjacentHTML(
    'afterbegin',
    purify.sanitize(cloudPopoverView(), {
      SANITIZE_DOM: false,
    })
  );

  const selectCloud = $('select-cloud-storage');
  chrome.storage.local.get('cloudService', result => {
    const { cloudService } = result;
    if (cloudService) {
      selectCloud.value = cloudService;
      updateCloudStatus(cloudService);
    }
  });

  selectCloudService();
};

export default initializeCloudOptions;
