package utils

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/jpeg"
	"net/http"
	"net/url"
	"strings"
)

// SendRequestToUnsplash sends a constructed request while decoding the JSON
// response into the provided interface
func SendRequestToUnsplash(url string, target interface{}) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	err = CheckForErrors(resp)
	if err != nil {
		return err
	}

	return json.NewDecoder(resp.Body).Decode(target)
}

// GetURLQueryParams extracts the query parameters from a url string and returns
// a map of strings
func GetURLQueryParams(s string) (url.Values, error) {
	u, err := url.Parse(s)

	if err != nil {
		return nil, err
	}

	query := u.Query()
	return query, nil
}

// SendJSON sends a JSON response to the client
func SendJSON(w http.ResponseWriter, target interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(target)
}

// ImageURLToBase64 gets the Base64 representation of a JPEG image URL and
// returns it
func ImageURLToBase64(url string) (string, error) {
	resp, err := http.Get(url)

	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	buffer := &bytes.Buffer{}
	m, _, err := image.Decode(resp.Body)

	if err != nil {
		return "", err
	}

	if err := jpeg.Encode(buffer, m, nil); err != nil {
		return "", err
	}

	s := []string{
		"data:image/jpeg;base64,",
		base64.StdEncoding.EncodeToString(buffer.Bytes()),
	}

	str := strings.Join(s, "")

	return str, nil
}
