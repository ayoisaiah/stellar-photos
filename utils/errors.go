package utils

import (
	"bytes"
	"errors"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
)

// InternalServerError sends http.InternalServerError together with an optional
// customised message on why the error occured to the client
func InternalServerError(w http.ResponseWriter, str ...string) {
	msg := "Internal server error"

	if len(str) > 0 {
		msg = strings.Join(str, " ")
	}

	w.WriteHeader(http.StatusInternalServerError)
	w.Write([]byte(msg))
}

// SendError sends an error response to the client
func SendError(w http.ResponseWriter, err error) {
	a := []rune(err.Error())
	// status code is the first 3 characters of the error message
	statusCode, err2 := strconv.Atoi(string(a[0:3]))
	if err2 != nil {
		InternalServerError(w)
		return
	}

	w.WriteHeader(statusCode)
	w.Write([]byte(err.Error()))
}

// CheckForErrors checks if a non success http status code is retured by an API
// request and returns the appropriate error
func CheckForErrors(resp *http.Response) ([]byte, error) {
	buf, err := ioutil.ReadAll(resp.Body)

	// Because you can't read from an io.ReadCloser type twice unless you restore
	// the content
	resp.Body = ioutil.NopCloser(bytes.NewBuffer(buf))

	if err != nil {
		return nil, err
	}

	switch resp.StatusCode {
	case 200, 201, 202, 204, 205:
		return buf, nil
	case 401:
		return nil, &AuthorizationError{ErrString: errStringHelper(resp.StatusCode, "Unauthorized request", &buf)}
	case 403:
		return nil, &AuthorizationError{ErrString: errStringHelper(resp.StatusCode, "Access forbidden request", &buf)}

	case 404:
		return nil, &NotFoundError{ErrString: errStringHelper(resp.StatusCode, "The requested resource was not found", &buf)}
	default:
		return nil, errors.New(errStringHelper(resp.StatusCode, "API request returned an error", &buf))

	}
}

func errStringHelper(statusCode int, msg string, errBody *[]byte) string {
	var buf bytes.Buffer
	buf.WriteString(strconv.Itoa(statusCode))
	buf.WriteString(": ")
	buf.WriteString(msg)
	buf.WriteString(", Body: ")
	buf.Write(*errBody)
	return buf.String()
}
