package stellar

import (
	"os"
	"testing"

	"go.uber.org/zap"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/internal/utils/mocks"
)

var testApp *App

func TestMain(m *testing.M) {
	utils.Client = &mocks.MockClient{}

	os.Setenv("GO_ENV", "testing")

	testApp = &App{
		Config: &config.Config{},
		L:      zap.NewNop().Sugar(),
	}

	testApp.Config.Dropbox = config.DropboxConfig{
		Key: "sample_key",
	}
	testApp.Config.GoogleDrive = config.GoogleDriveConfig{
		Key: "sample_key",
	}
	testApp.Config.Onedrive = config.OnedriveConfig{
		AppID: "sample_id",
	}

	os.Exit(m.Run())
}
