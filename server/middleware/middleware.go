package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type ErrorHandler func(w http.ResponseWriter, r *http.Request) error

func (fn ErrorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := fn(w, r)
	if err == nil {
		return
	}

	errorResponse(r.Context(), w, err)
}

// errorResponse takes care of logging errors and sending them to the client.
func errorResponse(
	_ context.Context,
	w http.ResponseWriter,
	handlerErr error,
	keysAndValues ...any,
) {
	errResp := apperror.ErrorPayload{
		Error: "Internal server error",
	}

	statusCode := http.StatusInternalServerError

	//nolint:errorlint // nolint
	clientError, ok := handlerErr.(apperror.ClientError)
	if ok {
		errResp.Error = clientError.Message()

		statusCode = clientError.StatusCode()
	}

	b, err := json.Marshal(&errResp)
	if err != nil {
		// l.Error().Err(err).Msg("encoding error payload failed")

		b = []byte(fmt.Sprintf("{\"error\":\"%v\"}", errResp.Error))
	}

	if statusCode >= http.StatusInternalServerError {
		// l.Error().
		// 	Stack().
		// 	Err(handlerErr).
		// 	Fields(keysAndValues).
		// 	Msg("an unexpected error occurred")
	} else {
		// l.Debug().Err(handlerErr).Msg("an expected error occurred")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	_, err = w.Write(b)
	if err != nil {
		// TODO: Log error?
		// l.Error().Err(err).Msg("sending error response failed")
	}
}
