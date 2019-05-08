package main

import (
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/joho/godotenv"
)

func ReadEnv() {
	err := godotenv.Load()

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
	{"oeks929jesj", 422},
	{"9jdwnduwwen2", 422},
	{"2482jfn2kssi", 422},
}

func TestDownloadPhoto(t *testing.T) {
	ReadEnv()
	r := newRouter()

	mockServer := httptest.NewServer(r)

	for _, value := range imageIds {
		resp, err := http.Get(mockServer.URL + "/download-photo?id=" + value.id)

		if err != nil {
			t.Fatal(err)
		}

		if resp.StatusCode != value.statusCode {
			t.Errorf("Status should be %d, got %d", value.statusCode, resp.StatusCode)
		}
	}
}

func TestGetPhotoDownloadLocation(t *testing.T) {
	ReadEnv()

	for _, value := range imageIds {
		s, err := getPhotoDownloadLocation(value.id)

		if err != nil {
			t.Fatal(err)
		}

		if value.statusCode == 200 && s.URL == "" {
			t.Errorf("Expected UnsplashResponse URL field to be non-empty, got %s", s.URL)
		}

		if value.statusCode == 422 && s.Errors == nil {
			t.Errorf("Expected UnsplashResponse to contains Errors, got %v", s.Errors)
		}
	}
}

func makeRequest(t *testing.T, path string) {
	ReadEnv()

	r := newRouter()

	mockServer := httptest.NewServer(r)

	resp, err := http.Get(mockServer.URL + path)

	if err != nil {
		t.Fatal(err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Status should be %d, got %d", http.StatusOK, resp.StatusCode)
	}
}

func TestSearchUnsplash(t *testing.T) {
	makeRequest(t, "/search-unsplash?key=cars&page=1")
	makeRequest(t, "/search-unsplash?key=house&page=5")
}

func TestGetRandomPhoto(t *testing.T) {
	makeRequest(t, "/random-photo?collections=998309")
}
