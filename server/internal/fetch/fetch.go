package fetch

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/hashicorp/go-retryablehttp"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

const (
	defaultTimeoutInSeconds = 60
)

var (
	retryableClient            = retryablehttp.NewClient()
	defaultClient   HTTPClient = retryableClient.StandardClient()
)

func init() {
	retryableClient.RetryMax = 3
	retryableClient.Logger = nil

	retryableClient.RequestLogHook = func(_ retryablehttp.Logger, r *http.Request, n int) {
		if n == 0 {
			return
		}

		uri := r.URL.Scheme + "://" + r.URL.Host + r.URL.Path

		slog.InfoContext(
			r.Context(),
			fmt.Sprintf("retrying request to %s", uri),
			slog.Int("attempt_num", n),
		)
	}
}

// checkForErrors reads the entire response body and checks the status code of
// the response. If the status code is not 200, an error is returned. Otherwise,
// the response body is returned.
func checkForErrors(resp *http.Response) ([]byte, error) {
	buf, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	switch resp.StatusCode {
	case http.StatusOK:
		return buf, nil
	case http.StatusNotFound:
		return nil, apperror.ErrNotFound
	case http.StatusBadRequest:
		return nil, apperror.ErrBadRequest
	default:
		return nil, fmt.Errorf("%s", string(buf))
	}
}

// HTTPGet makes an HTTP GET request and decodes the JSON
// response into the provided target interface.
// If `target` is `nil`, the response body is returned as is
func HTTPGet[T any](
	ctx context.Context,
	endpoint string,
	target *T,
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

	start := time.Now()

	resp, err := defaultClient.Do(request)
	if err != nil {
		return nil, err
	}

	elapsed := time.Since(start).Milliseconds()

	uri := request.URL.Scheme + "://" + request.URL.Host + request.URL.Path

	slog.DebugContext(
		ctx,
		fmt.Sprintf("GET request to %s took %dms", uri, elapsed),
		slog.Int64("elapsed_ms", elapsed),
		slog.String("uri", uri),
	)

	defer resp.Body.Close()

	b, err := checkForErrors(resp)
	if err != nil {
		return nil, err
	}

	if target == nil {
		return b, nil
	}

	err = json.Unmarshal(b, target)
	if err != nil {
		return nil, err
	}

	return json.Marshal(target)
}

// HTTPPost makes an HTTP POST request and decodes the JSON
// response into the provided target interface.
// If `target` is `nil`, the response body is returned as is
func HTTPPost[T any](
	ctx context.Context,
	endpoint string,
	headers map[string]string,
	body io.Reader,
	target *T,
) ([]byte, error) {
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		endpoint,
		body,
	)
	if err != nil {
		return nil, err
	}

	for key, value := range headers {
		request.Header.Set(key, value)
	}

	start := time.Now()

	resp, err := defaultClient.Do(request)
	if err != nil {
		return nil, err
	}

	elapsed := time.Since(start).Milliseconds()

	uri := request.URL.Scheme + "://" + request.URL.Host + request.URL.Path

	slog.DebugContext(
		ctx,
		fmt.Sprintf("POST request to %s took %dms", uri, elapsed),
		slog.Int64("elapsed_ms", elapsed),
		slog.String("uri", uri),
	)

	defer resp.Body.Close()

	b, err := checkForErrors(resp)
	if err != nil {
		return nil, err
	}

	if target == nil {
		return b, nil
	}

	err = json.Unmarshal(b, target)
	if err != nil {
		return nil, err
	}

	return json.Marshal(target)
}

// JSONResponse sends a 200 OK JSON response to the client.
func JSONResponse(_ context.Context, w http.ResponseWriter, b []byte) error {
	if !json.Valid(b) {
		return apperror.ErrInvalidJSONPayload
	}

	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(http.StatusOK)

	_, err := w.Write(b)
	if err != nil {
		return err
	}

	return nil
}
