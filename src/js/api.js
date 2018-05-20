import { validateResponse } from './libs/helpers';

const baseUrl = 'http://localhost:8080';
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

const saveToDropboxApi = (imageId, downloadUrl, dropboxToken) =>
  fetch(
    `${baseUrl}/dropbox/save?id=${imageId}&url=${downloadUrl}&token=${dropboxToken}`
  ).then(validateResponse);

const authorizeOnedrive = code =>
  fetch(`${baseUrl}/onedrive/auth?code=${code}`).then(validateResponse);

const refreshOnedriveTokenApi = token =>
  fetch(`${baseUrl}/onedrive/refresh?refresh_token=${token}`).then(
    validateResponse
  );

export {
  getRandomPhoto,
  searchPhotos,
  getForecast,
  saveToDropboxApi,
  authorizeOnedrive,
  refreshOnedriveTokenApi,
  validateCollections,
};
