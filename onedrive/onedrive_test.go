package onedrive

import (
	"encoding/json"
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

func TestSendOnedriveID(t *testing.T) {
	readEnv()

	req, err := http.NewRequest("GET", "/onedrive/id/", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(SendOnedriveID)

	handler.ServeHTTP(rr, req)

	o := &onedriveID{}

	json.NewDecoder(rr.Body).Decode(o)

	if o.ID == "" {
		t.Errorf("Expected ID to have string value, got empty string")
	}
}
