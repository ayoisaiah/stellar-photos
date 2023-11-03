package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"runtime"

	"github.com/ayoisaiah/stellar-photos/logger"
)

// Recover is used to log a panic before exiting the program.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				ctx := r.Context()
				l := logger.Ctx(ctx)

				stackSize := 8096
				stack := make([]byte, stackSize)
				stack = stack[:runtime.Stack(stack, false)]

				http.Error(
					w,
					http.StatusText(http.StatusInternalServerError),
					http.StatusInternalServerError,
				)

				// This will exit the program after logging the error
				l.Log(ctx, logger.LevelFatal, "panic recovery",
					slog.String("stack", string(stack)),
					slog.Any("error", fmt.Errorf("%v", err)),
				)
				os.Exit(1)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
