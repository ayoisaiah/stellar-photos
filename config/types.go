package config

// Config represents the all the environmental variables that should be present
// on start up
type Config struct {
	Port           string
	Unsplash       UnsplashConfig
	Onedrive       OnedriveConfig
	OpenWeatherMap OpenWeatherMapConfig
	Dropbox        DropboxConfig
	GoogleDrive    GoogleDriveConfig
}

// UnsplashConfig represents Unsplash's API configuration variables
type UnsplashConfig struct {
	AccessKey string
}

// OnedriveConfig represents Onedrive's API configuration variables
type OnedriveConfig struct {
	AppID  string
	Secret string
}

// OpenWeatherMapConfig represents OpenWeatherMap's configuration variables
type OpenWeatherMapConfig struct {
	AppID string
}

// DropboxConfig represents Dropbox's API configuration variables
type DropboxConfig struct {
	Key string
}

// GoogleDriveConfig represents Google Drive's API configuration variables
type GoogleDriveConfig struct {
	Key    string
	Secret string
}
