package main

import (
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"

	"github.com/joho/godotenv"
	cron "github.com/robfig/cron/v3"
	"github.com/rs/cors"
	"github.com/rs/xid"

	"github.com/ayoisaiah/stellar-photos"
	"github.com/ayoisaiah/stellar-photos/internal/cache"
	"github.com/ayoisaiah/stellar-photos/internal/logger"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

const handlerTimeout = 60

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func gzipCompression(fn http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			fn.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Content-Encoding", "gzip")

		gz := gzip.NewWriter(w)

		defer gz.Close()

		gzr := gzipResponseWriter{Writer: gz, ResponseWriter: w}

		fn.ServeHTTP(gzr, r)
	})
}

type rootHandler func(w http.ResponseWriter, r *http.Request) error

func (fn rootHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	reqIDRaw := ctx.Value(utils.ContextKeyRequestID)

	// requestID will be an empty string if type assertion fails
	requestID, _ := reqIDRaw.(string)

	// Handle panics
	defer func() {
		if err := recover(); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			logger.L().Fatalw("Could not recover from panic",
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

		logger.L().Errorw("Unexpected error from HTTP handler",
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
		logger.L().
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

		lrw := newLoggingResponseWriter(w)

		mux.ServeHTTP(lrw, r)

		logger.L().Infow("Incoming request",
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
func newRouter(app *stellar.App) http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/download-photo/", rootHandler(app.DownloadPhoto))
	mux.Handle("/search-unsplash/", rootHandler(app.SearchUnsplash))
	mux.Handle(
		"/random-photo/",
		gzipCompression(rootHandler(app.GetRandomPhoto)),
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

	return requestLogger(mux)
}

func run() error {
	err := godotenv.Load()
	if err != nil {
		return err
	}

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
		ReadTimeout: 5 * time.Second,
	}

	go func() {
		cache.Photos()

		c := cron.New()

		_, err = c.AddFunc("@daily", func() {
			cache.Photos()
		})
		if err != nil {
			app.L.Infow("Unable to schedule cron job",
				"tag", "cron_schedule_error",
				"error", err,
			)
		}

		c.Start()
	}()

	app.L.Infow(fmt.Sprintf("Server is listening on port: %s", app.Config.Port),
		"tag", "start_server",
	)

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
