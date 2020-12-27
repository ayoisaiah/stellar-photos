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

// SendGETRequest makes an HTTP GET request and decodes the JSON
// response into the provided target interface
func SendGETRequest(endpoint string, target interface{}) error {
	request, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}

	resp, err := Client.Do(request)
	if err != nil {
		if os.IsTimeout(err) {
			return NewHTTPError(err, http.StatusRequestTimeout, "Request to external API timed out")
		}

		return err
	}

	defer resp.Body.Close()

	body, err := CheckForErrors(resp)
	if err != nil {
		return err
	}

	return json.Unmarshal(body, target)
}

func SendPOSTRequest(endpoint string, formValues map[string]string) ([]byte, error) {
	form := url.Values{}
	for key, value := range formValues {
		form.Add(key, value)
	}

	request, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := Client.Do(request)
	if err != nil {
		if os.IsTimeout(err) {
			return nil, NewHTTPError(err, http.StatusRequestTimeout, "Request to external API timed out")
		}

		return nil, err
	}

	defer response.Body.Close()

	body, err := CheckForErrors(response)
	if err != nil {
		return nil, err
	}

	return body, nil
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

// JsonResponse sends a JSON response to the client. Error is always nil
func JsonResponse(w http.ResponseWriter, bytes []byte) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(bytes)
	return nil
}

// ImageURLToBase64 retrives the Base64 representation of an image URL and
// returns it
func ImageURLToBase64(endpoint string) (string, error) {
	ctx, cncl := context.WithTimeout(context.Background(), time.Second*20)
	defer cncl()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}

	resp, err := Client.Do(request)
	if err != nil {
		if os.IsTimeout(err) {
			return "", NewHTTPError(err, http.StatusRequestTimeout, "Request to external API timed out")
		}

		return "", err
	}

	defer resp.Body.Close()

	bytes, err := CheckForErrors(resp)
	if err != nil {
		return "", err
	}

	var base64Encoding string
	mimeType := http.DetectContentType(bytes)

	switch mimeType {
	case "image/jpeg":
		base64Encoding += "data:image/jpeg;base64,"
	default:
		return "", fmt.Errorf("Only JPEG images are supported")
	}

	base64Encoding += base64.StdEncoding.EncodeToString(bytes)

	return base64Encoding, nil
}
