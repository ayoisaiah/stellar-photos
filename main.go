package main

import (
	"log"
	"net/http"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/dropbox"
	"github.com/ayoisaiah/stellar-photos-server/googledrive"
	"github.com/ayoisaiah/stellar-photos-server/onedrive"
	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/weather"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func init() {
	if err := godotenv.Load(); err != nil {
		log.Println("File .env not found, reading configuration from ENV")
	}
}

// newRouter creates and returns a new HTTP request multiplexer
func newRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/download-photo/", unsplash.DownloadPhoto)
	mux.HandleFunc("/search-unsplash/", unsplash.SearchUnsplash)
	mux.HandleFunc("/random-photo/", unsplash.GetRandomPhoto)
	mux.HandleFunc("/validate-collections/", unsplash.ValidateCollections)
	mux.HandleFunc("/get-weather/", weather.GetForecast)
	mux.HandleFunc("/dropbox/key/", dropbox.SendDropboxKey)
	mux.HandleFunc("/dropbox/save/", dropbox.SaveToDropbox)
	mux.HandleFunc("/onedrive/id/", onedrive.SendOnedriveID)
	mux.HandleFunc("/onedrive/auth/", onedrive.AuthorizeOnedrive)
	mux.HandleFunc("/onedrive/refresh/", onedrive.RefreshOnedriveToken)
	mux.HandleFunc("/googledrive/key/", googledrive.SendGoogleDriveKey)
	mux.HandleFunc("/googledrive/auth/", googledrive.AuthorizeGoogleDrive)
	mux.HandleFunc("/googledrive/refresh/", googledrive.RefreshGoogleDriveToken)
	mux.HandleFunc("/googledrive/save/", googledrive.SaveToGoogleDrive)

	return mux
}

func main() {
	// This will crash the program if one of the required Env values is not set
	config.New()

	port := ":" + config.Conf.Port

	mux := newRouter()

	handler := cors.Default().Handler(mux)

	srv := &http.Server{
		Addr:    port,
		Handler: handler,
	}

	log.Fatal(srv.ListenAndServe())
}
