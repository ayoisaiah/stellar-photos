package main

import (
	"log"
	"net/http"
	"time"

	"github.com/joho/godotenv"
	"github.com/rs/cors"

	"github.com/ayoisaiah/stellar-photos"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/health"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/logger"
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
func newRouter() http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/health/live", rootHandler(health.Live))
	mux.Handle("/health/ready", rootHandler(health.Ready))

	mux.Handle("/download-photo/", rootHandler(stellar.DownloadPhoto))
	mux.Handle("/search-unsplash/", rootHandler(stellar.SearchUnsplash))
	mux.Handle(
		"/random-photo/",
		middleware.GzipCompression(rootHandler(stellar.GetRandomPhoto)),
	)
	mux.Handle(
		"/validate-collections/",
		rootHandler(stellar.ValidateCollections),
	)
	mux.Handle("/dropbox/key/", rootHandler(stellar.SendDropboxKey))
	mux.Handle("/dropbox/save/", rootHandler(stellar.SaveToDropbox))
	mux.Handle("/onedrive/id/", rootHandler(stellar.SendOnedriveID))
	mux.Handle("/onedrive/auth/", rootHandler(stellar.AuthorizeOnedrive))
	mux.Handle("/onedrive/refresh/", rootHandler(stellar.RefreshOnedriveToken))
	mux.Handle("/googledrive/key/", rootHandler(stellar.SendGoogleDriveKey))
	mux.Handle(
		"/googledrive/auth/",
		rootHandler(stellar.AuthorizeGoogleDrive),
	)
	mux.Handle(
		"/googledrive/refresh/",
		rootHandler(stellar.RefreshGoogleDriveToken),
	)
	mux.Handle("/googledrive/save/", rootHandler(stellar.SaveToGoogleDrive))

	return middleware.Recover(middleware.RequestLogger(mux))
}

func run() error {
	// Ignore error if `.env` file is not found since env variables
	// may be injected in some other way
	_ = godotenv.Load()

	conf := config.Get()

	port := ":" + conf.Port

	mux := newRouter()

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

	// go func() {
	// 	cache.Photos()
	//
	// 	c := cron.New()
	//
	// 	_, err := c.AddFunc("@daily", func() {
	// 		cache.Photos()
	// 	})
	// 	if err != nil {
	// 		app.L.Infow("unable to schedule cron job",
	// 			"error", err,
	// 		)
	// 	}
	//
	// 	c.Start()
	// }()

	l := logger.L()

	l.Info(
		"Stellar Photos Server is listening on port: " + conf.Port,
	)

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
