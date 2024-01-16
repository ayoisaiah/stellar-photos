package requests

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// getURLQueryParams extracts the query parameters from a url string and returns
// a map of strings.
func getURLQueryParams(s string) (url.Values, error) {
	u, err := url.Parse(s)
	if err != nil {
		return nil, err
	}

	query := u.Query()

	return query, nil
}

func decodeJSON(r io.Reader, target any) error {
	d := json.NewDecoder(r)
	d.DisallowUnknownFields()

	err := d.Decode(target)
	if err != nil {
		var syntaxError *json.SyntaxError

		var unmarshalTypeError *json.UnmarshalTypeError

		switch {
		case errors.As(err, &syntaxError) || errors.Is(err, io.ErrUnexpectedEOF):
			clientErr := apperror.ErrJSONSyntaxError.Err(err)
			clientErr.Detail = fmt.Sprintf(clientErr.Detail, syntaxError.Offset)

			return clientErr

		case errors.As(err, &unmarshalTypeError):
			clientErr := apperror.ErrJSONTypeInvalid.Err(err)
			clientErr.Detail = fmt.Sprintf(
				clientErr.Detail,
				unmarshalTypeError.Field,
				unmarshalTypeError.Offset,
			)

			return clientErr

		case strings.HasPrefix(err.Error(), "json: unknown field "):
			fieldName := strings.TrimPrefix(err.Error(), "json: unknown field ")
			clientErr := apperror.ErrJSONUnknownField.Err(err)
			clientErr.Detail = fmt.Sprintf(clientErr.Detail, fieldName)

			return clientErr

		case errors.Is(err, io.EOF):
			clientErr := apperror.ErrJSONEmpty.Err(err)

			return clientErr

		case err.Error() == "http: request body too large":
			// TODO: Set maximum size of payload
			clientErr := apperror.ErrPayloadTooLarge.Err(err)

			return clientErr

		default:
			return err
		}
	}

	return err
}
