import { validateResponse } from './libs/helpers';

const baseUrl =
  'DEV_OR_PROD' === 'dev'
    ? 'http://localhost:8080'
    : 'https://stellar-photos.herokuapp.com';
const getRandomPhoto = collections =>
  fetch(`${baseUrl}/random-photo/${collections}`).then(validateResponse);

const searchPhotos = (key, page) =>
  fetch(`${baseUrl}/search-unsplash/${key},${page}`).then(validateResponse);

const validateCollections = collections =>
  fetch(`${baseUrl}/validate-collections/${collections}`).then(response => {
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.text();
  });

const getForecast = (latitude, longitude, metricSystem) =>
  fetch(`${baseUrl}/get-weather/${latitude},${longitude},${metricSystem}`).then(
    validateResponse
  );

const saveToDropboxApi = (imageId, dropboxToken) =>
  fetch(`${baseUrl}/dropbox/save?id=${imageId}&token=${dropboxToken}`).then(
    validateResponse
  );

const getDropboxKey = () =>
  fetch(`${baseUrl}/dropbox/key`).then(validateResponse);

const authorizeOnedrive = code =>
  fetch(`${baseUrl}/onedrive/auth?code=${code}`).then(validateResponse);

const refreshOnedriveTokenApi = token =>
  fetch(`${baseUrl}/onedrive/refresh?refresh_token=${token}`).then(
    validateResponse
  );

const triggerPhotoDownload = id =>
  fetch(`${baseUrl}/download-photo?id=${id}`).then(validateResponse);

const getOnedriveId = () =>
  fetch(`${baseUrl}/onedrive/id`).then(validateResponse);

export {
  getRandomPhoto,
  searchPhotos,
  getForecast,
  saveToDropboxApi,
  getDropboxKey,
  authorizeOnedrive,
  refreshOnedriveTokenApi,
  validateCollections,
  triggerPhotoDownload,
  getOnedriveId,
};
