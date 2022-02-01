package utils

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	timeoutInSeconds = 60
)

// SendGETRequest makes an HTTP GET request and decodes the JSON
// response into the provided target interface.
func SendGETRequest(endpoint string, target interface{}) ([]byte, error) {
	request, err := http.NewRequest(http.MethodGet, endpoint, http.NoBody)
	if err != nil {
		return nil, err
	}

	resp, err := Client.Do(request)
	if err != nil {
		if os.IsTimeout(err) {
			return nil, NewHTTPError(
				err,
				http.StatusRequestTimeout,
				"Request to external API timed out",
			)
		}

		return nil, err
	}

	defer resp.Body.Close()

	body, err := CheckForErrors(resp)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(body, target)
	if err != nil {
		return nil, err
	}

	return json.Marshal(target)
}

func SendPOSTRequest(
	endpoint string,
	formValues map[string]string,
	target interface{},
) ([]byte, error) {
	form := url.Values{}
	for key, value := range formValues {
		form.Add(key, value)
	}

	request, err := http.NewRequest(
		http.MethodPost,
		endpoint,
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return nil, err
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := Client.Do(request)
	if err != nil {
		if os.IsTimeout(err) {
			return nil, NewHTTPError(
				err,
				http.StatusRequestTimeout,
				"Request to external API timed out",
			)
		}

		return nil, err
	}

	defer resp.Body.Close()

	body, err := CheckForErrors(resp)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(body, target)
	if err != nil {
		return nil, err
	}

	return json.Marshal(target)
}

// GetURLQueryParams extracts the query parameters from a url string and returns
// a map of strings.
func GetURLQueryParams(s string) (url.Values, error) {
	u, err := url.Parse(s)
	if err != nil {
		return nil, err
	}

	query := u.Query()

	return query, nil
}

// JSONResponse sends a JSON response to the client.
func JSONResponse(w http.ResponseWriter, bs []byte) error {
	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(http.StatusOK)

	_, err := w.Write(bs)
	if err != nil {
		return err
	}

	return nil
}

// imageURLToBase64 retrives the Base64 representation of an image URL and
// returns it.
func imageURLToBase64(endpoint string) (string, error) {
	ctx, cancel := context.WithTimeout(
		context.Background(),
		time.Second*timeoutInSeconds,
	)

	defer cancel()

	var base64Encoding string

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		endpoint,
		http.NoBody,
	)
	if err != nil {
		return base64Encoding, err
	}

	resp, err := Client.Do(request)
	if err != nil {
		if os.IsTimeout(err) {
			return base64Encoding, NewHTTPError(
				err,
				http.StatusRequestTimeout,
				"Timeout exceeded while fetching image from network for base64 encoding",
			)
		}

		return base64Encoding, err
	}

	defer resp.Body.Close()

	bytes, err := CheckForErrors(resp)
	if err != nil {
		return base64Encoding, err
	}

	mimeType := http.DetectContentType(bytes)

	switch mimeType {
	case "image/jpeg":
		base64Encoding += "data:image/jpeg;base64,"
	case "image/png":
		base64Encoding += "data:image/png;base64,"
	default:
		return "", fmt.Errorf(
			"only image/jpeg and image/png mime types are supported, got %s",
			mimeType,
		)
	}

	base64Encoding += base64.StdEncoding.EncodeToString(bytes)

	return base64Encoding, nil
}
