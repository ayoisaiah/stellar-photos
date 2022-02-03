package stellar

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/ayoisaiah/stellar-photos/internal/utils/mocks"
)

func TestSendOnedriveID(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "/onedrive/id/", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	err = testApp.SendOnedriveID(rr, req)
	if err != nil {
		t.Errorf("Expected no errors, but got %v", err)
	}

	o := &onedrive{}

	err = json.NewDecoder(rr.Body).Decode(o)
	if err != nil {
		t.Errorf("Expected no errors, but got %v", err)
	}

	if o.ID == "" {
		t.Errorf("Expected ID to have string value, got empty string")
	}
}

func TestAuthorizeOnedrive(t *testing.T) {
	mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
		body, err := os.ReadFile("testdata/onedrive_auth_response.json")
		if err != nil {
			return nil, err
		}

		r := io.NopCloser(bytes.NewReader(body))

		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       r,
		}, nil
	}

	fakeCode := "df6aa589-1080-b241-b410-c4dff65dbf7c"
	path := fmt.Sprintf("/onedrive/auth?code=%s", fakeCode)

	req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	rr := httptest.NewRecorder()

	err = testApp.AuthorizeOnedrive(rr, req)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	o := &onedriveAuth{}

	err = json.NewDecoder(rr.Body).Decode(o)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if o.Scope != "Files.ReadWrite.AppFolder Files.ReadWrite" {
		t.Fatalf(
			"Authorization object does not conform to expectations. Got %+v",
			o,
		)
	}
}

func TestRefreshOnedriveToken(t *testing.T) {
	mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
		body, err := os.ReadFile("testdata/onedrive_auth_response.json")
		if err != nil {
			return nil, err
		}

		r := io.NopCloser(bytes.NewReader(body))

		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       r,
		}, nil
	}

	fakeToken := "M.R3_BAY.-CV6vzB3NeXGBlyaWzWQx!!EIl9syapPWbG9B5FMMNl5R5oBkoHpmncK1dE*JVhc75u7WqCSXDQRYnMw7Zz8hh96ua!BgiG6r5tzptVxXN2uR5oPIUBzM1rsxCh2znzikQNQX7VUPDlKtQSWRguKYYIVQTe1S6gfO6kugB!GVihfJjsP9FQuPPdJ06yyoGzwF!tz3tcdtJHFbN2XNGEzTALm*BiUWqFuM4mE1AnbeJoRA5F0tW4LDXJ4OTOCngcA84LWGFmLHIgE1lz*ZHTDBHewzfqdRGs2Z8WE1cjIYYheKQE5TQNrn10U6l0fhReHcNQkMDjRFKveuqW*RjuzcBzo$"
	path := fmt.Sprintf("/onedrive/refresh?refresh_token=%s", fakeToken)

	req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	rr := httptest.NewRecorder()

	err = testApp.RefreshOnedriveToken(rr, req)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	o := &onedriveAuth{}

	err = json.NewDecoder(rr.Body).Decode(o)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if o.Scope != "Files.ReadWrite.AppFolder Files.ReadWrite" {
		t.Fatalf(
			"Authorization object does not conform to expectations. Got %+v",
			o,
		)
	}
}
