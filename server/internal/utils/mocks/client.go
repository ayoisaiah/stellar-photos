package mocks

import "net/http"

// GetDoFunc fetches the mock client's `Do` func.
var GetDoFunc func(req *http.Request) (*http.Response, error)

// MockClient is the mock client.
type MockClient struct {
	DoFunc func(req *http.Request) (*http.Response, error)
}

func (m *MockClient) Do(req *http.Request) (*http.Response, error) {
	return GetDoFunc(req)
}
