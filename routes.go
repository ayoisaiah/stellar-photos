package main

import (
	"net/http"
)

func newRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/download-photo/", downloadPhoto)
	mux.HandleFunc("/search-unsplash/", searchUnsplash)
	mux.HandleFunc("/random-photo/", getRandomPhoto)
	mux.HandleFunc("/validate-collections/", validateCollections)
	mux.HandleFunc("/get-weather/", getWeatherInfo)
	mux.HandleFunc("/dropbox/key/", sendDropboxKey)
	mux.HandleFunc("/dropbox/save/", saveToDropbox)
	mux.HandleFunc("/onedrive/id/", sendOnedriveId)
	mux.HandleFunc("/onedrive/auth/", authorizeOnedrive)
	mux.HandleFunc("/onedrive/refresh", refreshOnedriveToken)

	return mux
}
