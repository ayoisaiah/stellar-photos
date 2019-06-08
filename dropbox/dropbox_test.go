package dropbox

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/joho/godotenv"
)

func readEnv() {
	err := godotenv.Load("../.env")

	if err != nil {
		log.Fatal("Error loading .env file")
	}

	_ = config.New()
}

func TestGetDropboxKey(t *testing.T) {
	readEnv()

	req, err := http.NewRequest("GET", "/dropbox/key/", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(SendDropboxKey)

	handler.ServeHTTP(rr, req)

	key := &key{}

	json.NewDecoder(rr.Body).Decode(key)

	if key.DropboxKey == "" {
		t.Errorf("Expected string value, got empty string")
	}
}

var imageIds = []struct {
	id         string
	statusCode int
}{
	{"bWI4Vd4vI3w", 200},
	{"xjQhTrxyVBw", 200},
	{"7NcGuPF5NU0", 200},
	{"oeks929jesj", 404},
	{"9jdwnduwwen", 404},
	{"aaaaa1aaaaa", 404},
}

func TestSaveToDropbox(t *testing.T) {
	readEnv()

	token := os.Getenv("DROPBOX_TOKEN")

	if token == "" {
		t.Fatal("DROPBOX_TOKEN not found in Env")
	}

	for _, value := range imageIds {
		path := fmt.Sprintf("/dropbox/save/?id=%s&token=%s", value.id, token)
		req, err := http.NewRequest("GET", path, nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(SaveToDropbox)

		handler.ServeHTTP(rr, req)

		if rr.Code != value.statusCode {
			t.Errorf("Status should be %d, got %d", value.statusCode, rr.Code)
		}
	}
}
