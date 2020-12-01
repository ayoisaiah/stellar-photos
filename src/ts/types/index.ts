import * as r from 'runtypes';
import { UnsplashImage } from './unsplash';
import { Forecast } from './weather';

type PhotoFrequency =
  | 'newtab'
  | 'every15minutes'
  | 'everyhour'
  | 'everyday'
  | 'paused';

type TemparatureUnit = 'metric' | 'imperial';

type Coords = {
  longitude: number;
  latitude: number;
};

const OnedriveAuth = r.Record({
  token_type: r.String,
  expires_in: r.Number,
  scope: r.String,
  access_token: r.String,
  refresh_token: r.String,
});

type OnedriveAuth = r.Static<typeof OnedriveAuth>;

export interface ChromeLocalStorage {
  history?: UnsplashImage[];
  nextImage?: UnsplashImage;
  forecast?: Forecast;
  cloudService?: 'dropbox' | 'onedrive';
  dropbox?: string;
  onedrive?: OnedriveAuth;
}

export interface ChromeSyncStorage {
  temperatureFormat?: TemparatureUnit;
  imageSource?: string;
  photoFrequency?: PhotoFrequency;
  collections?: string;
  coords?: Coords;
}

export interface ChromeStorage extends ChromeLocalStorage, ChromeSyncStorage {}

export { OnedriveAuth };
