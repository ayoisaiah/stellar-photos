package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/joho/godotenv"
	cron "github.com/robfig/cron/v3"
	"github.com/rs/cors"

	"github.com/ayoisaiah/stellar-photos-server/cache"
	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/dropbox"
	"github.com/ayoisaiah/stellar-photos-server/googledrive"
	"github.com/ayoisaiah/stellar-photos-server/onedrive"
	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

type rootHandler func(w http.ResponseWriter, r *http.Request) error

func (fn rootHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Handle panics
	defer func() {
		if err := recover(); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			utils.L().Fatalw("Recovering from panic failed",
				"tag", "recover_from_panic_error",
				"error", err,
				"stack_trace", string(debug.Stack()),
			)
		}
	}()

	err := fn(w, r)
	if err == nil {
		return
	}

	utils.L().Errorw("Error from handler",
		"tag", "http_handler_error",
		"error", err,
	)

	var clientError utils.ClientError

	if !errors.As(err, &clientError) {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	body, err := clientError.ResponseBody()
	if err != nil {
		utils.L().
			Errorw("Unexpected error while converting error response body to JSON",
				"tag", "client_response_body_error",
				"error", err,
			)

		w.WriteHeader(http.StatusInternalServerError)

		return
	}

	status, headers := clientError.ResponseHeaders()

	for k, v := range headers {
		w.Header().Set(k, v)
	}

	w.WriteHeader(status)

	_, err = w.Write(body)
	if err != nil {
		utils.L().
			Errorw("Unexpected error while writing error response",
				"tag", "http_write_body_error",
				"error", err,
			)
	}
}

func requestLogger(mux http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		mux.ServeHTTP(w, r)

		utils.L().Infow("Incoming request",
			"tag", "incoming_request",
			"method", r.Method,
			"uri", r.RequestURI,
			"user_agent", r.UserAgent(),
			"timestamp", start.Format(time.RFC3339),
			"time_taken_ms", time.Since(start).Milliseconds(),
		)
	})
}

// newRouter creates and returns a new HTTP request multiplexer.
func newRouter() http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/download-photo/", rootHandler(unsplash.DownloadPhoto))
	mux.Handle("/search-unsplash/", rootHandler(unsplash.SearchUnsplash))
	mux.Handle("/random-photo/", rootHandler(unsplash.GetRandomPhoto))
	mux.Handle(
		"/validate-collections/",
		rootHandler(unsplash.ValidateCollections),
	)
	mux.Handle("/dropbox/key/", rootHandler(dropbox.SendDropboxKey))
	mux.Handle("/dropbox/save/", rootHandler(dropbox.SaveToDropbox))
	mux.Handle("/onedrive/id/", rootHandler(onedrive.SendOnedriveID))
	mux.Handle("/onedrive/auth/", rootHandler(onedrive.AuthorizeOnedrive))
	mux.Handle("/onedrive/refresh/", rootHandler(onedrive.RefreshOnedriveToken))
	mux.Handle("/googledrive/key/", rootHandler(googledrive.SendGoogleDriveKey))
	mux.Handle(
		"/googledrive/auth/",
		rootHandler(googledrive.AuthorizeGoogleDrive),
	)
	mux.Handle(
		"/googledrive/refresh/",
		rootHandler(googledrive.RefreshGoogleDriveToken),
	)
	mux.Handle("/googledrive/save/", rootHandler(googledrive.SaveToGoogleDrive))

	return requestLogger(mux)
}

func run() error {
	err := godotenv.Load()
	if err != nil {
		return err
	}

	// Initialising the config package will crash the program if one of
	// the required Env values is not set
	conf := config.New()

	port := ":" + conf.Port

	mux := newRouter()

	handler := cors.Default().Handler(mux)

	srv := &http.Server{
		Addr:    port,
		Handler: handler,
	}

	go func() {
		cache.Photos()

		c := cron.New()

		_, err = c.AddFunc("@daily", func() {
			cache.Photos()
		})
		if err != nil {
			utils.L().Infow("Unable to call AddFunc",
				"tag", "cron_schedule_daily",
			)
		}

		c.Start()
	}()

	utils.L().Infow(fmt.Sprintf("Server is listening on port: %s", port))

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
