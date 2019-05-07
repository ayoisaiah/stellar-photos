package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

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

	sendJson(w, data)
}

func getPhotoDownloadLocation(id string) (*Download, error) {
	UNSPLASH_ACCESS_KEY := fmt.Sprintf("%v", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("https://api.unsplash.com/photos/%v/download?client_id=%v", id, UNSPLASH_ACCESS_KEY)

	s := new(Download)
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

	UNSPLASH_ACCESS_KEY := fmt.Sprintf("%v", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("https://api.unsplash.com/search/photos?page=%v&query=%v&per_page=%v&client_id=%v", page, key, 28, UNSPLASH_ACCESS_KEY)

	s := new(Search)
	err = getJson(url, s)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	sendJson(w, s)
}

func getRandomPhoto(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	collections := values.Get("collections")
	width := 2000

	UNSPLASH_ACCESS_KEY := fmt.Sprintf("%v", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("https://api.unsplash.com/photos/random?collections=%v&w=%v&client_id=%v", collections, width, UNSPLASH_ACCESS_KEY)

	s := new(RandomPhoto)
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

	data := RandomPhotoWithBase64{
		RandomPhoto: *s,
		Base64:      base64,
	}

	sendJson(w, data)
}

func validateCollections(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	collections := strings.Split(values.Get("collections"), ",")

	UNSPLASH_ACCESS_KEY := fmt.Sprintf("%v", os.Getenv("UNSPLASH_ACCESS_KEY"))

	for _, value := range collections {
		url := fmt.Sprintf("https://api.unsplash.com/collections/%v/?client_id=%v", value, UNSPLASH_ACCESS_KEY)
		c := new(Collection)
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
