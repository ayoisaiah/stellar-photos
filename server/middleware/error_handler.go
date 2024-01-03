package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type ErrorHandler func(w http.ResponseWriter, r *http.Request) error

func (fn ErrorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := fn(w, r)
	if err == nil {
		return
	}

	sendErrorResponse(r.Context(), w, err)
}

// sendErrorResponse sends error responses to the client. In the case of
// unexpected errors, they are logged first.
func sendErrorResponse(
	ctx context.Context,
	w http.ResponseWriter,
	handlerErr error, // the error from the HTTP handler
) {
	// The default error
	errResp := apperror.ErrorPayload{
		Error: "Internal server error",
	}

	// Default status code
	statusCode := http.StatusInternalServerError

	//nolint:errorlint // nolint
	clientError, ok := handlerErr.(apperror.ClientError)
	if ok {
		errResp.Error = clientError.Message()

		statusCode = clientError.StatusCode()
	}

	b, err := json.Marshal(&errResp)
	if err != nil {
		slog.ErrorContext(
			ctx,
			"encoding error payload as JSON failed, falling back to manual encoding",
			slog.Any("error", err),
		)

		b = []byte(fmt.Sprintf("{\"error\":\"%v\"}", errResp.Error))
	}

	if statusCode >= http.StatusInternalServerError {
		slog.ErrorContext(
			ctx,
			"an unexpected error occurred",
			slog.Any("error", handlerErr),
		)
	} else {
		slog.DebugContext(ctx, "delivering normal error response", slog.Any("error", handlerErr))
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	_, err = w.Write(b)
	if err != nil {
		slog.ErrorContext(
			ctx,
			"sending error response failed",
			slog.Any("error", err),
		)
	}
}
