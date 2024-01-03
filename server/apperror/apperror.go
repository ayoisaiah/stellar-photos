package apperror

import (
	"fmt"
	"log/slog"
	"path/filepath"

	"github.com/mdobak/go-xerrors"
)

type ErrorPayload struct {
	Error string `json:"error"`
}

type stackFrame struct {
	Func   string `json:"func"`
	Source string `json:"source"`
	Line   int    `json:"line"`
}

// ClientError is an error whose details is to be shared with the client.
type ClientError interface {
	Error() string
	Message() string
	StatusCode() int
}

// Error represents a custom application error.
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

// Message returns the client-side error message.
func (e Error) Message() string {
	return e.Detail
}

// StatusCode returns the HTTP status code for the error.
func (e Error) StatusCode() int {
	return e.Status
}

// Err associates the underlying error.
func (e Error) Err(err error) Error {
	e.Cause = err
	return e
}

// Fmt calls fmt.Sprintf on the Error detail.
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

func marshalStack(err error) []stackFrame {
	trace := xerrors.StackTrace(err)

	if len(trace) == 0 {
		return nil
	}

	frames := trace.Frames()

	s := make([]stackFrame, len(frames))

	for i, v := range frames {
		f := stackFrame{
			Source: filepath.Join(
				filepath.Base(filepath.Dir(v.File)),
				filepath.Base(v.File),
			),
			Func: filepath.Base(v.Function),
			Line: v.Line,
		}

		s[i] = f
	}

	return s
}

// FmtErr returns a slog.GroupValue with keys `msg` and `trace`. If the error
// does not implement interface { StackTrace() errors.StackTrace }, the `trace`
// key is omitted.
func FmtErr(err error) slog.Value {
	var groupValues []slog.Attr

	groupValues = append(groupValues, slog.String("msg", err.Error()))

	frames := marshalStack(err)

	if frames != nil {
		groupValues = append(groupValues,
			slog.Any("trace", frames),
		)
	}

	return slog.GroupValue(groupValues...)
}
