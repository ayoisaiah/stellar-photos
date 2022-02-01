package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"

	"github.com/go-redis/redis/v8"
	"github.com/joho/godotenv"
	"github.com/rs/cors"

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
			utils.Logger().
				Errorw("Recover error", "tag", "recover_error", "error", err, "trace", string(debug.Stack()))
		}
	}()

	err := fn(w, r)
	if err == nil {
		return
	}

	utils.Logger().
		Errorw("HandlerFunc error", "tag", "handler_error", "error", err)

	var clientError utils.ClientError

	if !errors.As(err, &clientError) {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	body, err := clientError.ResponseBody()
	if err != nil {
		utils.Logger().
			Errorw("An error occurred", "tag", "client_response_body", "error", err)

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
		return
	}
}

// newRouter creates and returns a new HTTP request multiplexer.
func newRouter() *http.ServeMux {
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

	return mux
}

func run() error {
	err := godotenv.Load()
	if err != nil {
		return err
	}

	// Initialising the config package will crash the program if one of
	// the required Env values is not set
	conf := config.New()

	r := redis.NewClient(&redis.Options{
		Addr:     config.Conf.Redis.Addr,
		Username: config.Conf.Redis.Username,
		Password: config.Conf.Redis.Password,
		DB:       config.Conf.Redis.DB,
	})

	utils.InitRedis(r)

	port := ":" + conf.Port

	mux := newRouter()

	handler := cors.Default().Handler(mux)

	srv := &http.Server{
		Addr:    port,
		Handler: handler,
	}

	utils.Logger().Infow(fmt.Sprintf("Server is listening on port: %s", port))

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
