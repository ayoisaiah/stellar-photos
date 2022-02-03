package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime/debug"
	"time"

	"github.com/joho/godotenv"
	cron "github.com/robfig/cron/v3"
	"github.com/rs/cors"
	"github.com/rs/xid"

	"github.com/ayoisaiah/stellar-photos-server/cache"
	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/dropbox"
	"github.com/ayoisaiah/stellar-photos-server/googledrive"
	"github.com/ayoisaiah/stellar-photos-server/onedrive"
	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func NewLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

type rootHandler func(w http.ResponseWriter, r *http.Request) error

func (fn rootHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	reqIDRaw := ctx.Value(utils.ContextKeyRequestID)

	// requestID will be an empty string if type assertion fails
	requestID, _ := reqIDRaw.(string)

	// Handle panics
	defer func() {
		if err := recover(); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			utils.L().Fatalw("Could not recover from panic",
				"tag", "recover_from_panic_error",
				"error", err,
				"stack_trace", string(debug.Stack()),
				"request_id", requestID,
			)
		}
	}()

	err := fn(w, r)
	if err == nil {
		return
	}

	var clientError utils.ClientError

	if !errors.As(err, &clientError) {
		status := http.StatusInternalServerError
		if os.IsTimeout(err) {
			status = http.StatusRequestTimeout
		}

		utils.L().Errorw("Unexpected error from HTTP handler",
			"tag", "http_handler_error",
			"error", err,
			"status_code", status,
			"request_id", requestID,
		)

		w.WriteHeader(status)

		return
	}

	body := clientError.ResponseBody()

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
				"request_id", requestID,
			)
	}
}

func requestLogger(mux http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		requestID := xid.New().String()

		ctx := r.Context()

		ctx = context.WithValue(ctx, utils.ContextKeyRequestID, requestID)

		r = r.WithContext(ctx)

		lrw := NewLoggingResponseWriter(w)

		mux.ServeHTTP(lrw, r)

		utils.L().Infow("Incoming request",
			"tag", "incoming_request",
			"method", r.Method,
			"uri", r.RequestURI,
			"user_agent", r.UserAgent(),
			"request_id", requestID,
			"timestamp", start.Format(time.RFC3339),
			"time_taken_ms", time.Since(start).Milliseconds(),
			"status_code", lrw.statusCode,
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
	conf := config.Get()

	port := ":" + conf.Port

	mux := newRouter()

	handler := cors.Default().Handler(mux)

	srv := &http.Server{
		Addr:    port,
		Handler: handler,
	}

	go func() {
		// cache.Photos()

		c := cron.New()

		_, err = c.AddFunc("@daily", func() {
			cache.Photos()
		})
		if err != nil {
			utils.L().Infow("Unable to schedule cron job",
				"tag", "cron_schedule_error",
				"error", err,
			)
		}

		c.Start()
	}()

	utils.L().Infow(fmt.Sprintf("Server is listening on port: %s", conf.Port),
		"tag", "start_server",
	)

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
