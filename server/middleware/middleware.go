package middleware

import (
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/rs/xid"
	"go.uber.org/zap"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/logger"
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

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
			l.Info("Incoming request",
				zap.String("method", r.Method),
				zap.String("uri", r.RequestURI),
				zap.String("user_agent", r.UserAgent()),
				zap.Int64("time_taken_ms", time.Since(start).Milliseconds()),
				zap.Int("status_code", lrw.statusCode),
			)
		}()

		next.ServeHTTP(lrw, r)
	})
}

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				ctx := r.Context()
				l := logger.FromCtx(ctx)

				stackSize := 8096
				stack := make([]byte, stackSize)
				stack = stack[:runtime.Stack(stack, false)]

				l.Fatal("panic recovery",
					zap.ByteString("stack", stack),
					zap.Error(fmt.Errorf("%v", err)),
				)

				http.Error(
					w,
					http.StatusText(http.StatusInternalServerError),
					http.StatusInternalServerError,
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
