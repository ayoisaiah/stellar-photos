package middleware

import (
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/mileusna/useragent"
	"github.com/rs/xid"
	"go.uber.org/zap"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/logger"
	"github.com/ayoisaiah/stellar-photos/metrics"
)

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

// RequestLogger logs incoming requests and increments relevant metrics.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ua := useragent.Parse(r.UserAgent())

		m := metrics.Get()
		m.TotalRequests.WithLabelValues(r.URL.Path).Inc()
		m.UserAgent.WithLabelValues(ua.Name).Inc()

		start := time.Now()

		requestID := xid.New().String()

		ctx := r.Context()

		ctx = context.WithValue(ctx, utils.ContextKeyRequestID, requestID)

		r2 := r.WithContext(ctx)

		w.Header().Add("X-Request-ID", requestID)

		lrw := newLoggingResponseWriter(w)

		l := logger.L().
			WithOptions(zap.Fields(zap.String("request_id", requestID)))

		r2 = r2.WithContext(logger.WithContext(r2.Context(), l))

		*r = *r2

		defer func() {
			m.RequestDuration.WithLabelValues(r.URL.Path).
				Observe(time.Since(start).Seconds())

			l.Info(
				strings.Join(
					[]string{
						"Incoming request:",
						r.Method,
						r.URL.RequestURI(),
						strconv.Itoa(lrw.statusCode),
					},
					" ",
				),
				zap.String("method", r.Method),
				zap.String("uri", r.URL.RequestURI()),
				zap.String("user_agent", r.UserAgent()),
				zap.Int64("time_taken_ms", time.Since(start).Milliseconds()),
				zap.Int("status_code", lrw.statusCode),
			)
		}()

		next.ServeHTTP(lrw, r)
	})
}

// Recover is used to log a panic before exiting the program.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				ctx := r.Context()
				l := logger.FromCtx(ctx)

				stackSize := 8096
				stack := make([]byte, stackSize)
				stack = stack[:runtime.Stack(stack, false)]

				http.Error(
					w,
					http.StatusText(http.StatusInternalServerError),
					http.StatusInternalServerError,
				)

				// This will exit the program after logging the error
				l.Fatal("panic recovery",
					zap.ByteString("stack", stack),
					zap.Error(fmt.Errorf("%v", err)),
				)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func GzipCompression(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Content-Encoding", "gzip")

		gz := gzip.NewWriter(w)

		defer gz.Close()

		gzr := gzipResponseWriter{Writer: gz, ResponseWriter: w}

		next.ServeHTTP(gzr, r)
	})
}
