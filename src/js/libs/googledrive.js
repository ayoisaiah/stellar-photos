import loadingIndicator from './loading-indicator';
import { refreshGoogleDriveToken } from './google-drive-auth';
import { validateResponse, lessThanOneHourAgo } from './helpers';

const authorizeGoogleDrive = () => {
  const params = {
    cliend_id: '805647132215-u97scm6hm5n2j3bsjhlk3j1l9uh1uld3.apps.googleusercontent.com',
    redirect_uri: 'https://stellarapp.photos',
    response_type: 'code',
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/drive.appfolder',
  };

  chrome.tabs.create({
    url: `https://accounts.google.com/o/oauth2/v2/auth?scope=${params.scope}&redirect_uri=${params.redirect_uri}&access_type=${params.access_type}&client_id=${params.cliend_id}&response_type=${params.response_type}`,
  });
};

const saveToGoogleDrive = (imageId, downloadUrl) => {
  const googleDriveData = JSON.parse(localStorage.getItem('googledrive'));

  if (!googleDriveData) {
    authorizeGoogleDrive();
    return;
  }

  loadingIndicator().start();

  if (!lessThanOneHourAgo(googleDriveData.timestamp)) {
    refreshGoogleDriveToken(imageId, downloadUrl);
  }

  const googleDriveToken = JSON.parse(localStorage.getItem(('googledrive'))).access_token;
  fetch(`http://localhost:8080/api/googledrive/save?accessToken=${googleDriveToken}&imageId=${imageId}&downloadUrl=${downloadUrl}`)
    .then(validateResponse);
};

export { authorizeGoogleDrive, saveToGoogleDrive };
