import { validateResponse } from './helpers';

const baseUrl =
  // @ts-ignore
  'STELLAR_ENV' === 'dev'
    ? 'http://localhost:8080'
    : 'https://stellar-photos.herokuapp.com';

async function makeRequest(url: string): Promise<Response> {
  const response = await fetch(url);
  return validateResponse(response);
}

function getRandomPhoto(collections: string): Promise<Response> {
  return makeRequest(`${baseUrl}/random-photo/?collections=${collections}`);
}

function searchPhotos(key: string, page: number): Promise<Response> {
  return makeRequest(`${baseUrl}/search-unsplash/?key=${key}&page=${page}`);
}

function validateCollections(collections: string): Promise<Response> {
  return makeRequest(
    `${baseUrl}/validate-collections/?collections=${collections}`
  );
}

function getForecast(
  latitude: number,
  longitude: number,
  metricSystem: string
): Promise<Response> {
  return makeRequest(
    `${baseUrl}/get-weather/?lat=${latitude}&lon=${longitude}&metric=${metricSystem}`
  );
}

function saveToDropboxApi(
  imageId: string,
  dropboxToken: string,
  url: string
): Promise<Response> {
  return makeRequest(
    `${baseUrl}/dropbox/save/?id=${imageId}&token=${dropboxToken}&url=${url}`
  );
}

function getDropboxKey(): Promise<Response> {
  return makeRequest(`${baseUrl}/dropbox/key/`);
}

function authorizeOnedrive(code: string): Promise<Response> {
  return makeRequest(`${baseUrl}/onedrive/auth/?code=${code}`);
}

function refreshOnedriveTokenApi(token: string): Promise<Response> {
  return makeRequest(`${baseUrl}/onedrive/refresh/?refresh_token=${token}`);
}

function trackDownload(id: string): Promise<Response> {
  return makeRequest(`${baseUrl}/download-photo/?id=${id}`);
}

function getOnedriveId(): Promise<Response> {
  return makeRequest(`${baseUrl}/onedrive/id/`);
}

function getGoogleDriveKey(): Promise<Response> {
  return makeRequest(`${baseUrl}/googledrive/key/`);
}

function authorizeGoogleDrive(code: string): Promise<Response> {
  return makeRequest(`${baseUrl}/googledrive/auth/?code=${code}`);
}

function refreshGoogleDriveTokenApi(token: string): Promise<Response> {
  return makeRequest(`${baseUrl}/googledrive/refresh/?refresh_token=${token}`);
}

function saveToGoogleDriveApi(
  imageId: string,
  token: string,
  url: string
): Promise<Response> {
  return makeRequest(
    `${baseUrl}/googledrive/save/?id=${imageId}&token=${token}&url=${url}`
  );
}

export {
  getRandomPhoto,
  searchPhotos,
  getForecast,
  saveToDropboxApi,
  getDropboxKey,
  authorizeOnedrive,
  refreshOnedriveTokenApi,
  validateCollections,
  trackDownload,
  getOnedriveId,
  getGoogleDriveKey,
  authorizeGoogleDrive,
  refreshGoogleDriveTokenApi,
  saveToGoogleDriveApi,
};
