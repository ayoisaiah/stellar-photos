package apperror

import "fmt"

type ErrorPayload struct {
	Error string `json:"error"`
}

// ClientError is an error whose details is to be shared with the client.
type ClientError interface {
	Error() string
	Message() string
	StatusCode() int
}

// Error represents a custom application error
type Error struct {
	// The underlying error
	Cause error `json:"-"`
	// Safe error message for client delivery
	Detail string `json:"error"`
	Status int    `json:"-"`
}

// Error satisfies the error interface.
func (e Error) Error() string {
	if e.Cause == nil {
		return e.Detail
	}

	return e.Cause.Error()
}

// Message returns the client-side error message
func (e Error) Message() string {
	return e.Detail
}

// StatusCode returns the HTTP status code for the error
func (e Error) StatusCode() int {
	return e.Status
}

// Err associates the underlying error
func (e Error) Err(err error) Error {
	e.Cause = err
	return e
}

// Fmt calls fmt.Sprintf on the Error detail
func (e Error) Fmt(str ...any) Error {
	e.Detail = fmt.Sprintf(e.Detail, str...)
	return e
}

func New(err error, statusCode int) Error {
	return Error{
		Cause:  err,
		Status: statusCode,
	}
}
