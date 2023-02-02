package stellar

import (
	"os"
	"testing"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/internal/utils/mocks"
)

var testApp *App

func TestMain(m *testing.M) {
	utils.Client = &mocks.MockClient{}

	os.Setenv("GO_ENV", "testing")

	conf := config.Get()

	conf.Dropbox = config.DropboxConfig{
		Key: "sample_key",
	}

	conf.GoogleDrive = config.GoogleDriveConfig{
		Key: "sample_key",
	}

	conf.Onedrive = config.OnedriveConfig{
		AppID: "sample_id",
	}

	os.Exit(m.Run())
}
