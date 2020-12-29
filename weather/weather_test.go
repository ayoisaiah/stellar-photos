package weather

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/utils"
	"github.com/ayoisaiah/stellar-photos-server/utils/mocks"
)

func init() {
	utils.Client = &mocks.MockClient{}
	config.Conf = &config.Config{}
}

func TestGetForecast(t *testing.T) {
	table := []struct {
		latitide   float64
		longitude  float64
		metric     string
		statusCode int
		jsonFile   string
	}{
		{8.478600, 4.536080, "metric", 200, "weather_forecast_response"},
		{60.51, -181, "metric", 400, "weather_error_response"},
	}

	for i, value := range table {
		t.Run(fmt.Sprintf("%d", i), func(t *testing.T) {
			mocks.GetDoFunc = func(*http.Request) (*http.Response, error) {
				body, err := ioutil.ReadFile(fmt.Sprintf("../testdata/%s.json", value.jsonFile))
				if err != nil {
					t.Fatalf("Unexpected error: %v", err)
				}

				w := &weatherInfo{}
				err = json.Unmarshal(body, w)
				if err != nil {
					t.Fatalf("Unexpected error: %v", err)
				}

				var statusCode int
				if w.Name != "" {
					statusCode = 200
				} else {
					statusCode = 400
				}

				r := ioutil.NopCloser(bytes.NewReader(body))
				return &http.Response{
					StatusCode: statusCode,
					Body:       r,
				}, nil
			}

			path := fmt.Sprintf("/get-weather?lat=%f&lon=%f&metric=%s", value.latitide, value.longitude, value.metric)
			req, err := http.NewRequest(http.MethodGet, path, nil)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			rr := httptest.NewRecorder()
			err = GetForecast(rr, req)
			if err == nil {
				if value.statusCode > 300 {
					t.Fatalf("Expected error for '%f, %f', but got none", value.latitide, value.longitude)
				}

				return
			}

			clientError, ok := err.(utils.ClientError)
			if !ok {
				t.Fatalf("Unexpected error: %v", err)
			}

			status, _ := clientError.ResponseHeaders()
			if status != value.statusCode {
				t.Errorf("Status should be %d, got %d", value.statusCode, status)
			}
		})
	}
}
