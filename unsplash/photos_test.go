package unsplash

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/joho/godotenv"
)

func readEnv() {
	err := godotenv.Load("../.env")

	if err != nil {
		log.Fatal("Error loading .env file")
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

func TestDownloadPhoto(t *testing.T) {
	readEnv()

	for _, value := range imageIds {
		path := fmt.Sprintf("/download-photo?id=%s", value.id)

		req, err := http.NewRequest("GET", path, nil)

		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(DownloadPhoto)

		handler.ServeHTTP(rr, req)

		if rr.Code != value.statusCode {
			t.Errorf("Status should be %d, got %d", value.statusCode, rr.Code)
		}
	}
}

func TestGetPhotoDownloadLocation(t *testing.T) {
	readEnv()

	for _, value := range imageIds {
		s, err := GetPhotoDownloadLocation(value.id)

		if err != nil && value.statusCode == 200 {
			t.Errorf("Expect no errors from GetPhotoDownloadLocation for a valid photo id")
		}

		if err == nil && value.statusCode == 500 {
			t.Errorf("Expected GetPhotoDownloadLocation to throw an error for an invalid photo id")
		}

		if value.statusCode == 200 && s.URL == "" {
			t.Errorf("Expected UnsplashResponse URL field to be non-empty, got %s", s.URL)
		}
	}
}

func makeRequest(t *testing.T, path string, h func(http.ResponseWriter, *http.Request)) {
	readEnv()

	req, err := http.NewRequest("GET", path, nil)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(h)

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Status should be %d, got %d", http.StatusOK, rr.Code)
	}
}

var searchTable = []struct {
	key  string
	page int
}{
	{"cars", 1},
	{"house", 6},
	{"animal", 10},
}

func TestSearchUnsplash(t *testing.T) {
	for _, value := range searchTable {
		makeRequest(t, fmt.Sprintf("/search-unsplash?key=%s&page=%d", value.key, value.page), SearchUnsplash)
	}
}

func TestGetRandomPhoto(t *testing.T) {
	makeRequest(t, "/random-photo?collections=998309", GetRandomPhoto)
}

var collectionsTable = []struct {
	ids        string
	statusCode int
}{
	{"998309,317099", 200},
	{"39843782,4993402", 500},
	{"151521,9829382", 500},
	{"175083,762960", 200},
}

func TestValidateCollections(t *testing.T) {
	readEnv()

	for _, value := range collectionsTable {
		path := fmt.Sprintf("/validate-collections?collections=%s", value.ids)
		req, err := http.NewRequest("GET", path, nil)

		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(ValidateCollections)

		handler.ServeHTTP(rr, req)

		if rr.Code != value.statusCode {
			t.Errorf("Status should be %d, got %d", http.StatusOK, rr.Code)
		}
	}
}
