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

type Settings = {
  imageSource: string;
  photoFrequency: PhotoFrequency;
  collections: string;
  coords: Coords;
  temperatureFormat: TemparatureUnit;
  cloudService: 'dropbox' | 'onedrive' | null;
  dropbox?: string;
  onedrive?: Onedrive;
};

export type { Settings };
