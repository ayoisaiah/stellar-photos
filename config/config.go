package config

import (
	"log"
	"os"
)

// Conf represents the application configuration
var Conf *Config

// New returns a new Config struct
func New() *Config {
	Conf = &Config{
		Port: getEnv("PORT", "8080"),
		Unsplash: UnsplashConfig{
			AccessKey: getEnv("UNSPLASH_ACCESS_KEY", ""),
		},
		Onedrive: OnedriveConfig{
			AppID:  getEnv("ONEDRIVE_APPID", ""),
			Secret: getEnv("ONEDRIVE_SECRET", ""),
		},
		OpenWeatherMap: OpenWeatherMapConfig{
			AppID: getEnv("OPENWEATHER_APPID", ""),
		},
		Dropbox: DropboxConfig{
			Key: getEnv("DROPBOX_KEY", ""),
		},
	}

	return Conf
}

// getEnv reads an environment variable and returns it or returns a default
// value if the variable is optional. Otherwise, if a required variable is not
// set, the program will crash
func getEnv(key string, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}

	if defaultVal == "" {
		log.Fatalf("%s has not been set in your ENV", key)
	}

	return defaultVal
}
