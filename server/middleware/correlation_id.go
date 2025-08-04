package middleware

import (
	"net/http"

	"github.com/segmentio/ksuid"
)

const (
	correlationHeader = "X-Correlation-ID"
)

// CorrelationID generates a new ID to uniquely identify a request. It adds the ID
// to the response headers and request context.
func CorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		correlationID := r.Header.Get(correlationHeader)

		if correlationID == "" {
			correlationID = ksuid.New().String()
		}

		r = r.WithContext(ctx)

		w.Header().Set(correlationHeader, correlationID)

		next.ServeHTTP(w, r)
	})
}
