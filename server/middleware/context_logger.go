package middleware

import (
	"net/http"

	"github.com/ayoisaiah/stellar-photos/logger"
)

// CtxLogger adds an slog.Logger to the request context.
func CtxLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		l := logger.L()

		r = r.WithContext(logger.WithContext(ctx, l))

		next.ServeHTTP(w, r)
	})
}
