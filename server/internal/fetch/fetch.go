package fetch

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// JSONResponse verifies the JSON payload and sends it to the client.
func JSONResponse(
	ctx context.Context,
	w http.ResponseWriter,
	payload any,
) error {
	return JSONResponseWithStatus(ctx, w, payload, http.StatusOK)
}

func JSONResponseWithStatus(
	ctx context.Context,
	w http.ResponseWriter,
	payload any,
	status int,
) (err error) {
	b, ok := payload.([]byte)
	if !ok {
		b, err = json.Marshal(payload)
		if err != nil {
			return err
		}
	}

	if !json.Valid(b) {
		// TODO: This should never happen
		return apperror.ErrJSONPayloadInvalid
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	_, err = w.Write(b)

	return err
}
