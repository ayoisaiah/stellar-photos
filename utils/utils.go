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

func GetJson(url string, target interface{}) error {
	resp, err := http.Get(url)

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	return json.NewDecoder(resp.Body).Decode(target)
}

func GetURLQueryParams(s string) (url.Values, error) {
	u, err := url.Parse(s)

	if err != nil {
		return nil, err
	}

	query := u.Query()
	return query, nil
}

func SendJson(w http.ResponseWriter, target interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(target)
}

func ImageUrlToBase64(url string) (string, error) {
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
