package mocks

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type download struct {
	URL string `json:"url,omitempty"`
}

func MockTrackPhotoDownload(file string) (*http.Response, error) {
	jsonObj, err := os.ReadFile(fmt.Sprintf("../testdata/%s.json", file))
	if err != nil {
		return nil, err
	}

	d := &download{}

	err = json.Unmarshal(jsonObj, d)
	if err != nil {
		return nil, err
	}

	var statusCode int

	if d.URL == "" {
		statusCode = 404
	} else {
		statusCode = 200
	}

	r := io.NopCloser(bytes.NewReader(jsonObj))

	return &http.Response{
		StatusCode: statusCode,
		Body:       r,
	}, nil
}
