package stellar

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/internal/utils/mocks"
)

func TestGetDropboxKey(t *testing.T) {
	req, err := http.NewRequest("GET", "/dropbox/key/", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	err = testApp.SendDropboxKey(rr, req)
	if err != nil {
		t.Errorf("Expected no errors, but got %v", err)
	}

	d := &dropbox{}

	err = json.NewDecoder(rr.Body).Decode(d)
	if err != nil {
		t.Errorf("Expected no errors, but got %v", err)
	}

	if d.Key == "" {
		t.Errorf("Expected string value, got empty string")
	}
}

func TestSaveToDropbox(t *testing.T) {
	table := []struct {
		id               string
		url              string
		statusCode       int
		unsplashResponse string
	}{
		{
			"bWI4Vd4vI3w",
			"https://images.unsplash.com/photo-1471255618142-bc3ea8675f3a?ixlib=rb-1.2.1&q=85&fm=jpg&crop=entropy&cs=srgb",
			200,
			"sample_download_response",
		},
		{"oeks929jesj", "", 404, "photo_not_found_response"},
	}

	for _, value := range table {
		t.Run(value.id, func(t *testing.T) {
			mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
				var body []byte
				var err error
				statusCode := http.StatusOK

				if strings.Contains(req.URL.Path, "download") {
					return mocks.MockTrackPhotoDownload(value.unsplashResponse)
				} else if req.URL.Path == "/2/files/save_url" {
					body, err = os.ReadFile("testdata/dropbox_job_id_response.json")
					if err != nil {
						return nil, err
					}
				} else if req.URL.Path == "/2/files/save_url/check_job_status" {
					body, err = os.ReadFile("testdata/dropbox_complete_response.json")
					if err != nil {
						return nil, err
					}
				}

				r := io.NopCloser(bytes.NewReader(body))

				return &http.Response{
					StatusCode: statusCode,
					Body:       r,
				}, nil
			}

			fakeToken := "efvbjdkoefnejkmdefiojfndf3ffejfn"
			path := fmt.Sprintf(
				"/dropbox/save?token=%s&id=%s&url=%s",
				fakeToken,
				value.id,
				value.url,
			)
			req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			rr := httptest.NewRecorder()
			err = testApp.SaveToDropbox(rr, req)
			if err == nil {
				if value.statusCode != http.StatusOK {
					t.Fatalf("Expected error for '%s', but got none", value.id)
				}

				return
			}

			var clientError utils.ClientError

			if !errors.As(err, &clientError) {
				t.Fatalf("Unexpected error: %v", err)
			}

			status := clientError.StatusCode()
			if status != value.statusCode {
				t.Errorf(
					"Status should be %d, got %d",
					value.statusCode,
					status,
				)
			}
		})
	}
}
