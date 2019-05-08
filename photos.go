package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

const UnsplashApiUrl = "https://api.unsplash.com"

func downloadPhoto(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	id := values.Get("id")

	data, err := getPhotoDownloadLocation(id)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jsonResponse(w, data)
}

func getPhotoDownloadLocation(id string) (*UnsplashResponse, error) {
	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/photos/%s/download?client_id=%s", UnsplashApiUrl, id, UnsplashBaseUrl)

	s := &UnsplashResponse{}
	err := getJson(url, s)

	return s, err
}

func searchUnsplash(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	key := values.Get("key")
	page := values.Get("page")

	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/search/photos?page=%s&query=%s&per_page=%s&client_id=%s", UnsplashApiUrl, page, key, "28", UnsplashBaseUrl)

	s := &UnsplashResponse{}
	err = getJson(url, s)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jsonResponse(w, s)
}

func getRandomPhoto(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	collections := values.Get("collections")
	width := 2000

	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/photos/random?collections=%v&w=%v&client_id=%v", UnsplashApiUrl, collections, width, UnsplashBaseUrl)

	s := &UnsplashResponse{}
	err = getJson(url, s)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	imageUrl := s.Urls["custom"].(string)

	base64, err := imageUrlToBase64(imageUrl)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	x := RandomPhotoWithBase64{
		Base64: base64,
	}

	data := &UnsplashResponse{
		RandomPhoto:           s.RandomPhoto,
		RandomPhotoWithBase64: x,
	}

	jsonResponse(w, data)
}

func validateCollections(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	collections := strings.Split(values.Get("collections"), ",")

	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))

	for _, value := range collections {
		url := fmt.Sprintf("%s/collections/%s/?client_id=%s", UnsplashApiUrl, value, UnsplashBaseUrl)
		c := &Collection{}
		err := getJson(url, c)

		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		if c.Id == 0 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("200 - Collections are valid"))
}
