import dropboxButton from '../components/dropbox-button';
import onedriveButton from '../components/onedrive-button';
import googleDriveButton from '../components/google-drive-button';

/*
 * Load the buttons for the selected cloud service
 */

const cloudButton = photo => {
  const cloudService = localStorage.getItem('cloudService');

  if (cloudService === 'dropbox') {
    return dropboxButton(photo);
  }

  if (cloudService === 'onedrive') {
    return onedriveButton(photo);
  }

  if (cloudService === 'googledrive') {
    return googleDriveButton(photo);
  }

  return '';
};

export default cloudButton;
