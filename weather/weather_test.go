package weather

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/joho/godotenv"
)

func readEnv() {
	err := godotenv.Load("../.env")

	if err != nil {
		log.Fatal("Error loading .env file")
	}
}

var table = []struct {
	latitide   float64
	longitude  float64
	metric     string
	statusCode int
}{
	{8.478600, 4.536080, "metric", 200},
	{51.5074, 0.1278, "imperial", 200},
	{48.8566, 2.3522, "metric", 200},
	{40.7128, -74.0060, "imperial", 200},
	{-110.7128, 45.0060, "imperial", 400},
	{60.51, -181, "metric", 400},
}

func TestGetForecast(t *testing.T) {
	readEnv()

	for _, value := range table {
		path := fmt.Sprintf("/get-weather?lat=%f&lon=%f&metric=%s", value.latitide, value.longitude, value.metric)

		req, err := http.NewRequest("GET", path, nil)

		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(GetForecast)

		handler.ServeHTTP(rr, req)

		if rr.Code != value.statusCode {
			t.Errorf("Status should be %d, got %d", value.statusCode, rr.Code)
		}
	}
}
