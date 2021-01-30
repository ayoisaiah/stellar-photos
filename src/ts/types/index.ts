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

const OAuth2 = r
  .Record({
    token_type: r.String,
    expires_in: r.Number,
    scope: r.String,
    access_token: r.String,
  })
  .And(
    r.Partial({
      refresh_token: r.String,
    })
  );

type OAuth2 = r.Static<typeof OAuth2>;

export interface ChromeLocalStorage {
  history?: UnsplashImage[];
  nextImage?: UnsplashImage;
  forecast?: Forecast;
  cloudService?: 'dropbox' | 'onedrive' | 'googledrive';
  dropbox?: string;
  onedrive?: OAuth2 & { timestamp: number };
  googledrive?: OAuth2 & { timestamp: number };
}

export interface ChromeSyncStorage {
  temperatureFormat?: TemparatureUnit;
  imageSource?: string;
  photoFrequency?: PhotoFrequency;
  collections?: string;
  coords?: Coords;
  googleDriveRefreshToken?: string;
}

export interface ChromeStorage extends ChromeLocalStorage, ChromeSyncStorage {}

export { OAuth2 };