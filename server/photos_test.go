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

func TestDownloadPhoto(t *testing.T) {
	imageIds := []struct {
		input      string
		statusCode int
		jsonFile   string
	}{
		{"bWI4Vd4vI3w", 200, "sample_download_response"},
		{"oeks929jesj", 404, "photo_not_found_response"},
		{"", 400, ""},
	}

	for _, value := range imageIds {
		t.Run(value.input, func(t *testing.T) {
			mocks.GetDoFunc = func(*http.Request) (*http.Response, error) {
				return mocks.MockTrackPhotoDownload(value.jsonFile)
			}

			path := fmt.Sprintf("/download-photo?id=%s", value.input)
			req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			rr := httptest.NewRecorder()

			err = testApp.DownloadPhoto(rr, req)
			if err == nil {
				if value.statusCode > 300 {
					t.Fatalf(
						"Expected error for '%s', but got none",
						value.input,
					)
				}

				return
			}

			var clientError utils.ClientError

			if !errors.As(err, &clientError) {
				t.Fatalf("Unexpected error: %v", err)
			}

			status, _ := clientError.ResponseHeaders()
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

func TestSearchUnsplash(t *testing.T) {
	searchTable := []struct {
		input       string
		resultCount int
		jsonFile    string
	}{
		{"cars", 10000, "sample_search_response"},
		{"ehfdjsiuhre", 0, "empty_search_response"},
	}

	for _, value := range searchTable {
		t.Run(value.input, func(t *testing.T) {
			mocks.GetDoFunc = func(*http.Request) (*http.Response, error) {
				jsonObj, err := os.ReadFile(
					fmt.Sprintf("testdata/%s.json", value.jsonFile),
				)
				if err != nil {
					return nil, err
				}

				r := io.NopCloser(bytes.NewReader(jsonObj))
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       r,
				}, nil
			}

			path := fmt.Sprintf("/search-unsplash?key=%s&page=1", value.input)
			req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			rr := httptest.NewRecorder()

			err = testApp.SearchUnsplash(rr, req)
			if err != nil {
				var clientError utils.ClientError

				if !errors.As(err, &clientError) {
					t.Fatalf("Unexpected error: %v", err)
				}

				status, _ := clientError.ResponseHeaders()
				if status != http.StatusOK {
					t.Errorf(
						"Status should be %d, got %d",
						http.StatusOK,
						status,
					)
				}
			}

			resp := rr.Result()

			defer resp.Body.Close()

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			s := &unsplashSearchResult{}
			err = json.Unmarshal(body, s)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if s.Total != value.resultCount {
				t.Errorf(
					"Total search results for '%s' should be %d, got %d",
					value.input,
					value.resultCount,
					s.Total,
				)
			}
		})
	}
}

func TestGetRandomPhoto(t *testing.T) {
	collections := []struct {
		input      string
		statusCode int
		jsonFile   string
	}{
		{"998309,317099", 200, "random_photo_response"},
		{"", 200, "random_photo_response"},
	}

	for _, value := range collections {
		t.Run(value.input, func(t *testing.T) {
			mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
				var body []byte
				var err error
				if strings.Contains(req.URL.Path, "/photos/random") {
					body, err = os.ReadFile(
						fmt.Sprintf("testdata/%s.json", value.jsonFile),
					)
					if err != nil {
						return nil, err
					}
				}

				if strings.Contains(req.URL.Path, ".jpg") {
					body, err = os.ReadFile("testdata/random_image.jpg")
					if err != nil {
						return nil, err
					}
				}

				r := io.NopCloser(bytes.NewReader(body))

				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       r,
				}, nil
			}

			path := fmt.Sprintf("/random-photo?collections=%s", value.input)
			req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			rr := httptest.NewRecorder()
			err = testApp.GetRandomPhoto(rr, req)
			if err == nil {
				if value.statusCode > 300 {
					t.Fatalf(
						"Expected error for '%s', but got none",
						value.input,
					)
				}

				return
			}

			var clientError utils.ClientError

			if !errors.As(err, &clientError) {
				t.Fatalf("Unexpected error: %v", err)
			}

			status, _ := clientError.ResponseHeaders()
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

func TestValidateCollections(t *testing.T) {
	collections := []struct {
		input      string
		statusCode int
	}{
		{"998309,6DH-y8Ef6iY", 200},
		{"39843782,4993402", 404},
		{"998309,39843782", 404},
		{"ieufhhjej", 404},
	}

	m := map[string]struct {
		jsonFile   string
		statusCode int
	}{
		"998309": {
			jsonFile:   "sample_collections_response",
			statusCode: 200,
		},
		"6DH-y8Ef6iY": {
			jsonFile:   "sample_collections_response",
			statusCode: 200,
		},
		"39843782": {
			jsonFile:   "collections_not_found_response",
			statusCode: 404,
		},
		"4993402": {
			jsonFile:   "collections_not_found_response",
			statusCode: 404,
		},
		"ieufhhjej": {
			jsonFile:   "collections_not_found_response",
			statusCode: 404,
		},
	}

	for _, value := range collections {
		t.Run(value.input, func(t *testing.T) {
			mocks.GetDoFunc = func(req *http.Request) (*http.Response, error) {
				path := strings.TrimSuffix(req.URL.Path, "/")
				var id string
				n, _ := fmt.Sscanf(path, "/collections/%s/", &id)
				if n != 1 {
					return nil, fmt.Errorf("Failed to parse collection ID")
				}

				file := m[id].jsonFile
				jsonObj, err := os.ReadFile(
					fmt.Sprintf("testdata/%s.json", file),
				)
				if err != nil {
					return nil, err
				}

				r := io.NopCloser(bytes.NewReader(jsonObj))

				return &http.Response{
					StatusCode: m[id].statusCode,
					Body:       r,
				}, nil
			}

			path := fmt.Sprintf(
				"/validate-collections?collections=%s",
				value.input,
			)
			req, err := http.NewRequest(http.MethodGet, path, http.NoBody)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			rr := httptest.NewRecorder()
			err = testApp.ValidateCollections(rr, req)
			if err == nil {
				if value.statusCode > 300 {
					t.Fatalf(
						"Expected error for '%s', but got none",
						value.input,
					)
				}

				return
			}

			var clientError utils.ClientError

			if !errors.As(err, &clientError) {
				t.Fatalf("Unexpected error: %v", err)
			}

			status, _ := clientError.ResponseHeaders()
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
