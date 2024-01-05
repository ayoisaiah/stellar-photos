import { validateResponse } from './helpers';
import { ChromeSyncStorage } from './types';

const baseUrl =
  // @ts-ignore
  'NODE_ENV' === 'development'
    ? 'http://localhost'
    : 'https://stellarphotos.freshman.tech';

async function makeRequest(url: string): Promise<Response> {
  const response = await fetch(url);
  return validateResponse(response);
}

function getRandomPhoto(
  collections: string,
  resolution: ChromeSyncStorage['imageResolution']
): Promise<Response> {
  return makeRequest(
    `${baseUrl}/random-photo/?collections=${collections}&resolution=${resolution}`
  );
}

function searchPhotos(key: string, page: number): Promise<Response> {
  return makeRequest(`${baseUrl}/search-unsplash/?key=${key}&page=${page}`);
}

function validateCollections(collections: string): Promise<Response> {
  return makeRequest(
    `${baseUrl}/validate-collections/?collections=${collections}`
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
