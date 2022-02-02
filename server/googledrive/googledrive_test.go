package googledrive

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/utils"
	"github.com/ayoisaiah/stellar-photos-server/utils/mocks"
)

func init() {
	utils.Client = &mocks.MockClient{}
	driveConfig := config.GoogleDriveConfig{
		Key: "sample_key",
	}
	config.Conf = &config.Config{
		GoogleDrive: driveConfig,
	}
}

func TestSendGoogleDriveKey(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "/googledrive/key", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	err = SendGoogleDriveKey(rr, req)
	if err != nil {
		t.Errorf("Expected no errors, but got %v", err)
	}

	o := &key{}

	err = json.NewDecoder(rr.Body).Decode(o)
	if err != nil {
		t.Errorf("Expected no errors, but got %v", err)
	}

	if o.GoogleDriveKey == "" {
		t.Errorf(
			"Expected GoogleDriveKey to have string value, got empty string",
		)
	}
}

func TestAuthorizeGoogleDrive(t *testing.T) {
	mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
		body, err := os.ReadFile(
			"../testdata/googledrive_auth_response.json",
		)
		if err != nil {
			return nil, err
		}

		r := io.NopCloser(bytes.NewReader(body))

		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       r,
		}, nil
	}

	fakeCode := "4/P7q7W91a-oMsCeLvIaQm6bTrgtp7"
	path := fmt.Sprintf("/googledrive/auth?code=%s", fakeCode)

	req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	rr := httptest.NewRecorder()

	err = AuthorizeGoogleDrive(rr, req)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	o := &googleDriveAuth{}

	err = json.NewDecoder(rr.Body).Decode(o)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if o.Scope != "https://www.googleapis.com/auth/drive.metadata.readonly" {
		t.Fatalf(
			"Authorization object does not conform to expectations. Got %+v",
			o,
		)
	}
}

func TestRefreshGoogleDriveToken(t *testing.T) {
	mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
		body, err := os.ReadFile(
			"../testdata/googledrive_auth_response.json",
		)
		if err != nil {
			return nil, err
		}

		r := io.NopCloser(bytes.NewReader(body))

		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       r,
		}, nil
	}

	fakeToken := "debjejen2efemoee93fndmsnf4ie293jfndsmse29r3f48uvnfdmkcdnfehj2en2dnefeui2enejfe2i3fk4b3e2uh2jefrfbue2hiej3efkjbendmslakaqd20i3fihr2eji1pe2kdmnvfme"
	path := fmt.Sprintf("/googledrive/refresh?refresh_token=%s", fakeToken)

	req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	rr := httptest.NewRecorder()

	err = RefreshGoogleDriveToken(rr, req)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	o := &googleDriveAuth{}

	err = json.NewDecoder(rr.Body).Decode(o)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if o.Scope != "https://www.googleapis.com/auth/drive.metadata.readonly" {
		t.Fatalf(
			"Authorization object does not conform to expectations. Got %+v",
			o,
		)
	}
}

func TestSaveToGoogleDrive(t *testing.T) {
	mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
		var body []byte

		var err error

		statusCode := http.StatusOK

		if strings.Contains(req.URL.Path, "download") {
			return mocks.MockTrackPhotoDownload("sample_download_response")
		} else if strings.Contains(req.URL.Host, "images.unsplash.com") {
			body, err = os.ReadFile("../testdata/random_image.jpg")
			if err != nil {
				return nil, err
			}
		} else if req.URL.Path == "/upload/drive/v3/files" {
			body, err = os.ReadFile("../testdata/googledrive_save_response.json")
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

	fakeToken := "ya29.A0AfH6SMCIiJ_3yNh7yC4gcveh3JnPz4DkWM933ZR846lm6B5m5VBSul64Tmo0vqby3Juyf8l5DRvg0bCwPBf-OOCZbEDgVpy0ZhSjocylcRLg1YDXdWxJNk1Ah3U_8rBExJA-kj0akQQIfTn55WYxIK3r_hXpgf0"
	id := "FQhYGMZ_H_4"
	url := "https://images.unsplash.com/photo-1464151759330-a3441f3da55e%3Fixid%3DMXwyNzEzM3wwfDF8cmFuZG9tfHx8fHx8fHw%26ixlib%3Drb-1.2.1"
	path := fmt.Sprintf(
		"/googledrive/save?token=%s&id=%s&url=%s",
		fakeToken,
		id,
		url,
	)

	req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	rr := httptest.NewRecorder()

	err = SaveToGoogleDrive(rr, req)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
}
