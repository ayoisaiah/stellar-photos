package utils

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// AuthorizationError occurs for an Unauthorized request
type AuthorizationError struct {
	ErrString string
}

func (e AuthorizationError) Error() string {
	return e.ErrString
}

// NotFoundError occurs when the resource queried returns a 404.
type NotFoundError struct {
	ErrString string
}

func (e NotFoundError) Error() string {
	return e.ErrString
}

// SendGETRequest makes an HTTP GET request and decodes the JSON
// response into the provided target interface
func SendGETRequest(url string, target interface{}) error {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		if os.IsTimeout(err) {
			return fmt.Errorf("Request timed out on the server")
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

	request, err := http.NewRequest("POST", endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
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

// JsonResponse sends a JSON response to the client
func JsonResponse(w http.ResponseWriter, bytes []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(bytes)
}

// ImageURLToBase64 gets the Base64 representation of an image URL and
// returns it
func ImageURLToBase64(url string) (string, error) {
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	bytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var base64Encoding string
	mimeType := http.DetectContentType(bytes)

	switch mimeType {
	case "image/jpeg":
		base64Encoding += "data:image/jpeg;base64,"
	case "image/png":
		base64Encoding += "data:image/png;base64,"
	default:
		return "", fmt.Errorf("Only JPEG and PNG images are supported")
	}

	base64Encoding += base64.StdEncoding.EncodeToString(bytes)

	return base64Encoding, nil
}
