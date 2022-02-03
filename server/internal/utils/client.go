package utils

import (
	"net/http"
	"time"
)

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

var (
	Client HTTPClient = &http.Client{Timeout: 60 * time.Second}
)
