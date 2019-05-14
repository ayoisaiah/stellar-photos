package routes

import (
	"net/http"

	"github.com/ayoisaiah/stellar-photos-server/dropbox"
	"github.com/ayoisaiah/stellar-photos-server/onedrive"
	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/weather"
)

func NewRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/download-photo/", unsplash.DownloadPhoto)
	mux.HandleFunc("/search-unsplash/", unsplash.SearchUnsplash)
	mux.HandleFunc("/random-photo/", unsplash.GetRandomPhoto)
	mux.HandleFunc("/validate-collections/", unsplash.ValidateCollections)
	mux.HandleFunc("/get-weather/", weather.GetForecast)
	mux.HandleFunc("/dropbox/key/", dropbox.SendDropboxKey)
	mux.HandleFunc("/dropbox/save/", dropbox.SaveToDropbox)
	mux.HandleFunc("/onedrive/id/", onedrive.SendOnedriveId)
	mux.HandleFunc("/onedrive/auth/", onedrive.AuthorizeOnedrive)
	mux.HandleFunc("/onedrive/refresh", onedrive.RefreshOnedriveToken)

	return mux
}
