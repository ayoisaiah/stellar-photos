import loadingIndicator from './loading-indicator';
import { refreshOnedriveToken } from './onedrive-auth';
import { validateResponse, lessThanOneHourAgo } from './helpers';
import { notifyUnableToUpload } from './notifications';

const authorizeOneDrive = () => {
  const id = 'bab0e340-9dd5-4ac7-b917-bc12454d082c';

  chrome.tabs.create({
    url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${id}&scope=Files.ReadWrite.AppFolder offline_access&response_type=code&redirect_uri=https://stellarapp.photos`,
  });
};

let interval;

const monitorUploadProgress = (location, imageId) => {
  fetch(location)
    .then(validateResponse)
    .then((json) => {
      if (json.status === 'completed') {
        loadingIndicator().stop();

        clearInterval(interval);

        chrome.notifications.create(`notify-onedrive-${imageId}`, {
          type: 'basic',
          iconUrl: chrome.extension.getURL('icons/48.png'),
          title: '1 file uploaded',
          message: `photo-${imageId} was saved successfully to Onedrive`,
        });
      }
    })
    .catch(() => {
      clearInterval(interval);
      notifyUnableToUpload('Onedrive', imageId);
    });
};

const saveToOneDrive = (imageId, downloadUrl) => {
  const onedriveData = JSON.parse(localStorage.getItem('onedrive'));

  if (!onedriveData) {
    authorizeOneDrive();
    return;
  }

  loadingIndicator().start();

  if (!lessThanOneHourAgo(onedriveData.timestamp)) {
    refreshOnedriveToken(imageId, downloadUrl);
    return;
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    Prefer: 'respond-async',
    Authorization: `bearer ${onedriveData.access_token}`,
  });

  const body = {
    name: `photo-${imageId}.jpg`,
    '@microsoft.graph.sourceUrl': downloadUrl,
    file: {},
  };

  const init = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  };

  const request = new Request('https://graph.microsoft.com/v1.0/drive/special/approot/children', init);

  fetch(request)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.headers.get('location');
    })
    .then((location) => {
      interval = setInterval(() => monitorUploadProgress(location, imageId), 1000);
    })
    .catch(() => notifyUnableToUpload('Onedrive', imageId));
};

export { authorizeOneDrive, saveToOneDrive };
