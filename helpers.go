package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"image"
	"image/jpeg"
	"net/http"
	"net/url"
	"strings"
)

func getJson(url string, target interface{}) error {
	r, err := http.Get(url)

	if err != nil {
		return err
	}

	defer r.Body.Close()

	if r.StatusCode != 200 {
		return errors.New("Unsplash returned non-200 response")
	}

	return json.NewDecoder(r.Body).Decode(target)
}

func getURLQueryParams(s string) (url.Values, error) {
	u, err := url.Parse(s)

	if err != nil {
		return nil, err
	}

	query := u.Query()
	return query, nil
}

func sendJson(w http.ResponseWriter, data interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	return json.NewEncoder(w).Encode(data)
}

func imageUrlToBase64(url string) (string, error) {
	resp, err := http.Get(url)

	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	buffer := new(bytes.Buffer)
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
