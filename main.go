package main

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/dropbox"
	"github.com/ayoisaiah/stellar-photos-server/googledrive"
	"github.com/ayoisaiah/stellar-photos-server/onedrive"
	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/utils"
	"github.com/ayoisaiah/stellar-photos-server/weather"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"gopkg.in/natefinch/lumberjack.v2"
)

type rootHandler func(w http.ResponseWriter, r *http.Request) error

func (fn rootHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Handle panics
	defer func() {
		if err := recover(); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Println("err: ", err, "trace: ", string(debug.Stack()))
		}
	}()

	err := fn(w, r)
	if err == nil {
		return
	}

	log.Printf("An error accured: %v\n", err)

	clientError, ok := err.(utils.ClientError)
	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	body, err := clientError.ResponseBody()
	if err != nil {
		log.Printf("An error accured: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	status, headers := clientError.ResponseHeaders()
	for k, v := range headers {
		w.Header().Set(k, v)
	}

	w.WriteHeader(status)
	w.Write(body)
}

// newRouter creates and returns a new HTTP request multiplexer
func newRouter() *http.ServeMux {
	mux := http.NewServeMux()

	mux.Handle("/download-photo/", rootHandler(unsplash.DownloadPhoto))
	mux.Handle("/search-unsplash/", rootHandler(unsplash.SearchUnsplash))
	mux.Handle("/random-photo/", rootHandler(unsplash.GetRandomPhoto))
	mux.Handle("/validate-collections/", rootHandler(unsplash.ValidateCollections))
	mux.Handle("/get-weather/", rootHandler(weather.GetForecast))
	mux.Handle("/dropbox/key/", rootHandler(dropbox.SendDropboxKey))
	mux.Handle("/dropbox/save/", rootHandler(dropbox.SaveToDropbox))
	mux.Handle("/onedrive/id/", rootHandler(onedrive.SendOnedriveID))
	mux.Handle("/onedrive/auth/", rootHandler(onedrive.AuthorizeOnedrive))
	mux.Handle("/onedrive/refresh/", rootHandler(onedrive.RefreshOnedriveToken))
	mux.Handle("/googledrive/key/", rootHandler(googledrive.SendGoogleDriveKey))
	mux.Handle("/googledrive/auth/", rootHandler(googledrive.AuthorizeGoogleDrive))
	mux.Handle("/googledrive/refresh/", rootHandler(googledrive.RefreshGoogleDriveToken))
	mux.Handle("/googledrive/save/", rootHandler(googledrive.SaveToGoogleDrive))

	return mux
}

func run() error {
	godotenv.Load()

	// Initialising the config package will crash the program if one of
	// the required Env values is not set
	conf := config.New()

	// Set output for log statements
	log.SetOutput(&lumberjack.Logger{
		Filename:   "stellar.log",
		MaxSize:    5,
		MaxBackups: 3,
		MaxAge:     28,
		Compress:   false,
	})

	port := ":" + conf.Port

	mux := newRouter()

	handler := cors.Default().Handler(mux)

	srv := &http.Server{
		Addr:    port,
		Handler: handler,
	}

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
