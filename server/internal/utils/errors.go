package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"go.uber.org/zap"

	"github.com/ayoisaiah/stellar-photos/logger"
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
// the response. If the status code is not 200, a error is returned. Otherwise,
// the response body is returned.
func CheckForErrors(resp *http.Response) ([]byte, error) {
	buf, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	switch resp.StatusCode {
	case http.StatusOK:
		return buf, nil
	default:
		return nil, NewHTTPError(
			fmt.Errorf("%s", string(buf)),
			resp.StatusCode,
			fmt.Sprintf(
				"%d — Request to external API produced an error response",
				resp.StatusCode,
			),
		)
	}
}

func HandleError(
	ctx context.Context,
	w http.ResponseWriter,
	origErr error,
) {
	l := logger.FromCtx(ctx)

	statusCode := http.StatusInternalServerError

	if os.IsTimeout(origErr) {
		statusCode = http.StatusRequestTimeout
	}

	contentType := "application/json"

	errMsg := "internal server error"

	//nolint:errorlint // nolint
	clientError, ok := origErr.(ClientError)
	if ok {
		errMsg = clientError.ResponseMessage()

		statusCode = clientError.StatusCode()
	}

	var payload ErrorPayload
	payload.Error = errMsg

	b, err := json.Marshal(&payload)
	if err != nil {
		l.Error("Encoding error payload failed")

		b = []byte(fmt.Sprintf("{\"error\":\"%v\"}", errMsg))
	}

	if statusCode >= http.StatusInternalServerError {
		l.Error("an unexpected error occurred",
			zap.Error(origErr),
		)
	}

	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(statusCode)

	_, err = w.Write(b)
	if err != nil {
		l.Error("unable to send error response to client",
			zap.Error(err),
		)
	}
}
