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

type Settings = {
  imageSource: string;
  photoFrequency: PhotoFrequency;
  collections: string;
  coords: Coords;
  temperatureFormat: TemparatureUnit;
  cloudService: string;
};

export type { Settings };
