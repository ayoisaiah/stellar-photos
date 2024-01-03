package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// loggingResponseWriter wraps the http.ResponseWriter type and tracks the
// status code of the response.
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

// loggingResponseWriter creates a new loggingResponseWriter type with a default
// status code of 200 OK.
func newLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{w, http.StatusOK}
}

// WriteHeader records the status code of the response before the
// response headers are written.
func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// RequestLogger logs each incoming request to the server after the request has
// been processed and a response is sent so that the elapsed time is recorded.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lrw := newLoggingResponseWriter(w)

		defer func(start time.Time) {
			ctx := r.Context()

			slog.InfoContext(
				ctx,
				fmt.Sprintf("%s %s [%d]", r.Method, r.URL.Path, lrw.statusCode),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("referrer", r.Referer()),
				slog.String("user_agent", r.UserAgent()),
				slog.Int64("elapsed_ms", time.Since(start).Milliseconds()),
				slog.Int("status_code", lrw.statusCode),
			)
		}(time.Now())

		next.ServeHTTP(lrw, r)
	})
}
