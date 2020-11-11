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

type Onedrive = unknown;

export interface ChromeLocalStorage {
  history?: UnsplashImage[];
  nextImage?: UnsplashImage;
  forecast?: Forecast;
  cloudService?: 'dropbox' | 'onedrive';
  dropbox?: string;
  onedrive?: Onedrive;
}

export interface ChromeSyncStorage {
  temperatureFormat?: TemparatureUnit;
  imageSource?: string;
  photoFrequency?: PhotoFrequency;
  collections?: string;
  coords?: Coords;
}

export interface ChromeStorage extends ChromeLocalStorage, ChromeSyncStorage {}
