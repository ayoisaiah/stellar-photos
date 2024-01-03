package config

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"sync"
)

// Config represents the program configuration.
type Config struct {
	GoogleDrive GoogleDriveConfig
	Onedrive    OnedriveConfig
	Port        string
	RedirectURL string
	Dropbox     DropboxConfig
	LogLevel    string
	GoEnv       string
	Unsplash    UnsplashConfig
}

// UnsplashConfig represents Unsplash's API configuration variables.
type UnsplashConfig struct {
	AccessKey         string
	DefaultCollection string
	BaseURL           string
	DefaultPerPage    int
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

const (
	EnvProduction  = "production"
	EnvDevelopment = "development"
	EnvTesting     = "testing"
)

const (
	Version = "1.0.0"
)

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
			GoEnv:       getEnv("GO_ENV", EnvDevelopment),
			LogLevel:    getEnv("LOG_LEVEL", "0"),
			RedirectURL: getEnv("REDIRECT_URL", ""),
			Unsplash: UnsplashConfig{
				AccessKey:         getEnv("UNSPLASH_ACCESS_KEY", ""),
				DefaultCollection: "998309",
				DefaultPerPage:    28,
				BaseURL:           "https://api.unsplash.com",
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

// getEnv reads an environment variable and returns it or a default
// value if the variable is not found. If a required variable is not
// set, the program will crash.
func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}

	if defaultVal == "" {
		slog.ErrorContext(
			context.Background(),
			fmt.Sprintf("config error: %s is missing in your ENV", key),
		)
		os.Exit(1)
	}

	// * denotes an optional variable that should not crash the program if missing
	if defaultVal == "*" {
		return ""
	}

	return defaultVal
}
