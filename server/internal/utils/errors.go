package utils

import (
	"fmt"
	"io"
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type ErrorPayload struct {
	Error string `json:"error"`
}

// ClientError is an error whose details is to be shared with the client.
type ClientError interface {
	Error() string
	ResponseMessage() string
	StatusCode() int
}

// HTTPError implements ClientError interface.
type HTTPError struct {
	// The underlying error message
	Cause error `json:"-"`
	// Safe error message for client delivery
	Detail string `json:"error"`
	Status int    `json:"code"`
}

// Error causes HTTPError to satisfy the error interface.
func (e HTTPError) Error() string {
	if e.Cause == nil {
		return e.Detail
	}

	return e.Cause.Error()
}

// ResponseMessage returns error message to be shown to client.
func (e HTTPError) ResponseMessage() string {
	return e.Detail
}

// StatusCode returns status code to be used in http response.
func (e HTTPError) StatusCode() int {
	return e.Status
}

// NewHTTPError returns a new HTTPError.
func NewHTTPError(err error, status int, detail string) error {
	return &HTTPError{
		Cause:  err,
		Detail: detail,
		Status: status,
	}
}

// CheckForErrors reads the entire response body and checks the status code of
// the response. If the status code is not 200, an error is returned. Otherwise,
// the response body is returned.
func CheckForErrors(resp *http.Response) ([]byte, error) {
	buf, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	switch resp.StatusCode {
	case http.StatusOK:
		return buf, nil
	case http.StatusNotFound:
		return nil, apperror.ErrNotFound
	default:
		return nil, fmt.Errorf("%s", string(buf))
	}
}
