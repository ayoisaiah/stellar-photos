package utils

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
)

var errInvalidJSONPayload = &HTTPError{
	Detail: "The payload is not a valid JSON string",
	Status: http.StatusInternalServerError,
}

// SendGETRequest makes an HTTP GET request and decodes the JSON
// response into the provided target interface.
func SendGETRequest(
	ctx context.Context,
	endpoint string,
	target interface{},
) ([]byte, error) {
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		endpoint,
		http.NoBody,
	)
	if err != nil {
		return nil, err
	}

	resp, err := Client.Do(request)
	if err != nil {
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
	ctx context.Context,
	endpoint string,
	formValues map[string]string,
	target interface{},
) ([]byte, error) {
	form := url.Values{}
	for key, value := range formValues {
		form.Add(key, value)
	}

	request, err := http.NewRequestWithContext(
		ctx,
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
func JSONResponse(_ context.Context, w http.ResponseWriter, b []byte) error {
	if !json.Valid(b) {
		return errInvalidJSONPayload
	}

	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(http.StatusOK)

	_, err := w.Write(b)
	if err != nil {
		return err
	}

	return nil
}
