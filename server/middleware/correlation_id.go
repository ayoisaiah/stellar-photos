package middleware

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/segmentio/ksuid"

	"github.com/ayoisaiah/stellar-photos/internal/ctxmanager"
	"github.com/ayoisaiah/stellar-photos/logger"
)

const (
	correlationHeader = "X-Correlation-ID"
)

// RequestID generates a new ID to uniquely identify a request. It adds the ID
// to the response headers and updates the logging context such that this ID is
// present in all logs originating from the request.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		correlationID := r.Header.Get(correlationHeader)

		if correlationID == "" {
			correlationID = ksuid.New().String()
		}

		ctx = context.WithValue(ctx, ctxmanager.CorrelationIDKey, correlationID)

		l := logger.Ctx(ctx)

		l.With(slog.String("correlation_id", correlationID))

		r = r.WithContext(logger.WithContext(ctx, l))

		w.Header().Set(correlationHeader, correlationID)

		next.ServeHTTP(w, r)
	})
}
