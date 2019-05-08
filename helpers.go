package main

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

func getJson(url string, target interface{}) error {
	resp, err := http.Get(url)

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	return json.NewDecoder(resp.Body).Decode(target)
}

func getURLQueryParams(s string) (url.Values, error) {
	u, err := url.Parse(s)

	if err != nil {
		return nil, err
	}

	query := u.Query()
	return query, nil
}

func sendJson(w http.ResponseWriter, target interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(target)
}

func imageUrlToBase64(url string) (string, error) {
	resp, err := http.Get(url)

	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	buffer := &bytes.Buffer{}
	m, _, err := image.Decode(resp.Body)

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

func jsonResponse(w http.ResponseWriter, target *UnsplashResponse) error {
	w.Header().Set("Content-Type", "application/json")

	if target.Errors != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return json.NewEncoder(w).Encode(target)
	}

	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(target)
}
