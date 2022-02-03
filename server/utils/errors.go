package utils

import (
	"fmt"
	"io"
	"net/http"
)

// ClientError is an error whose details is to be shared with the client.
type ClientError interface {
	Error() string
	ResponseBody() []byte
	ResponseHeaders() (int, map[string]string)
}

// HTTPError implements ClientError interface.
type HTTPError struct {
	Cause  error  `json:"-"`
	Detail string `json:"error"`
	Status int    `json:"-"`
}

// Error causes HTTPError to satisfy the error interface.
func (e *HTTPError) Error() string {
	if e.Cause == nil {
		return e.Detail
	}

	return e.Detail + " : " + e.Cause.Error()
}

// ResponseBody returns error details as JSON.
func (e *HTTPError) ResponseBody() []byte {
	return []byte(fmt.Sprintf("{%q: %q}", "error", e.Detail))
}

// ResponseHeaders returns http status code and headers.
func (e *HTTPError) ResponseHeaders() (status int, headers map[string]string) {
	return e.Status, map[string]string{
		"Content-Type": "application/json; charset=utf-8",
	}
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
