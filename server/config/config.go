package config

import (
	"log"
	"os"
	"sync"
)

// Config represents the all the environmental variables that should be present
// on start up.
type Config struct {
	LogLevel    string
	Port        string
	RedirectURL string
	Unsplash    UnsplashConfig
	Onedrive    OnedriveConfig
	Dropbox     DropboxConfig
	GoogleDrive GoogleDriveConfig
	GoEnv       string
}

// UnsplashConfig represents Unsplash's API configuration variables.
type UnsplashConfig struct {
	AccessKey string
}

// OnedriveConfig represents Onedrive's API configuration variables.
type OnedriveConfig struct {
	AppID  string
	Secret string
}

// DropboxConfig represents Dropbox's API configuration variables.
type DropboxConfig struct {
	Key string
}

// GoogleDriveConfig represents Google Drive's API configuration variables.
type GoogleDriveConfig struct {
	Key    string
	Secret string
}

var (
	once sync.Once
	// conf represents the application configuration.
	conf *Config
)

// Get returns a new Config struct.
func Get() *Config {
	once.Do(func() {
		conf = &Config{
			Port:        getEnv("PORT", "8080"),
			GoEnv:       getEnv("GO_ENV", "development"),
			LogLevel:    getEnv("LOG_LEVEL", "0"),
			RedirectURL: getEnv("REDIRECT_URL", ""),
			Unsplash: UnsplashConfig{
				AccessKey: getEnv("UNSPLASH_ACCESS_KEY", ""),
			},
			Onedrive: OnedriveConfig{
				AppID:  getEnv("ONEDRIVE_APPID", ""),
				Secret: getEnv("ONEDRIVE_SECRET", ""),
			},
			Dropbox: DropboxConfig{
				Key: getEnv("DROPBOX_KEY", ""),
			},
			GoogleDrive: GoogleDriveConfig{
				Key:    getEnv("GOOGLE_DRIVE_KEY", ""),
				Secret: getEnv("GOOGLE_DRIVE_SECRET", ""),
			},
		}
	})

	return conf
}

// getEnv reads an environment variable and returns it or returns a default
// value if the variable is optional. Otherwise, if a required variable is not
// set, the program will crash.
func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}

	if defaultVal == "" && os.Getenv("GO_ENV") != "testing" {
		log.Fatalf("%s has not been set in your ENV", key)
	}

	// * denotes a variable that should not crash the program if not present in
	// the environment
	if defaultVal == "*" {
		return ""
	}

	return defaultVal
}
