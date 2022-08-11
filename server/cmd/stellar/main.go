package main

import (
	"log"
	"net/http"
	"time"

	"github.com/joho/godotenv"
	cron "github.com/robfig/cron/v3"
	"github.com/rs/cors"

	"github.com/ayoisaiah/stellar-photos"
	"github.com/ayoisaiah/stellar-photos/cache"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/middleware"
)

const handlerTimeout = 60

type rootHandler func(w http.ResponseWriter, r *http.Request) error

func (fn rootHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	err := fn(w, r)
	if err == nil {
		return
	}

	utils.HandleError(r.Context(), w, err)
}

// newRouter creates and returns a new HTTP request multiplexer.
func newRouter(app *stellar.App) http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/download-photo/", rootHandler(app.DownloadPhoto))
	mux.Handle("/search-unsplash/", rootHandler(app.SearchUnsplash))
	mux.Handle(
		"/random-photo/",
		middleware.GzipCompression(rootHandler(app.GetRandomPhoto)),
	)
	mux.Handle(
		"/validate-collections/",
		rootHandler(app.ValidateCollections),
	)
	mux.Handle("/dropbox/key/", rootHandler(app.SendDropboxKey))
	mux.Handle("/dropbox/save/", rootHandler(app.SaveToDropbox))
	mux.Handle("/onedrive/id/", rootHandler(app.SendOnedriveID))
	mux.Handle("/onedrive/auth/", rootHandler(app.AuthorizeOnedrive))
	mux.Handle("/onedrive/refresh/", rootHandler(app.RefreshOnedriveToken))
	mux.Handle("/googledrive/key/", rootHandler(app.SendGoogleDriveKey))
	mux.Handle(
		"/googledrive/auth/",
		rootHandler(app.AuthorizeGoogleDrive),
	)
	mux.Handle(
		"/googledrive/refresh/",
		rootHandler(app.RefreshGoogleDriveToken),
	)
	mux.Handle("/googledrive/save/", rootHandler(app.SaveToGoogleDrive))

	return middleware.Recover(middleware.RequestLogger(mux))
}

func run() error {
	// Ignore error if `.env` file is not found since env variables
	// may be injected in some other way
	_ = godotenv.Load()

	app := stellar.NewApp()

	port := ":" + app.Config.Port

	mux := newRouter(app)

	handler := cors.Default().Handler(mux)

	srv := &http.Server{
		Addr: port,
		Handler: http.TimeoutHandler(
			handler,
			handlerTimeout*time.Second,
			"request timed out",
		),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       5 * time.Second,
	}

	go func() {
		cache.Photos()

		c := cron.New()

		_, err := c.AddFunc("@daily", func() {
			cache.Photos()
		})
		if err != nil {
			app.L.Infow("unable to schedule cron job",
				"error", err,
			)
		}

		c.Start()
	}()

	app.L.Infof(
		"Stellar Photos Server is listening on port: %s",
		app.Config.Port,
	)

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
