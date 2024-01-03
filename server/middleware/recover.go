package middleware

import (
	"log/slog"
	"net/http"
	"os"
	"runtime"

	"github.com/ayoisaiah/stellar-photos/internal/logger"
)

// Recover logs a panic before exiting the program.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				ctx := r.Context()
				stackSize := 8096
				stack := make([]byte, stackSize)
				stack = stack[:runtime.Stack(stack, false)]

				// TODO: This error is not received by the client
				http.Error(
					w,
					http.StatusText(http.StatusInternalServerError),
					http.StatusInternalServerError,
				)

				slog.Log(ctx, logger.LevelFatal, "panic in handler detected",
					slog.String("stack", string(stack)),
					slog.Any("error", err),
				)
				os.Exit(1)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
