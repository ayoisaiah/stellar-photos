package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func getWeatherInfo(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	latitide := values.Get("lat")
	longitude := values.Get("lon")
	metric := values.Get("metric")

	OPENWEATHER_APPID := fmt.Sprintf("%v", os.Getenv("OPENWEATHER_APPID"))
	url := fmt.Sprintf("http://api.openweathermap.org/data/2.5/weather?lat=%v&lon=%v&units=%v&appid=%v", latitide, longitude, metric, OPENWEATHER_APPID)

	forecast := &WeatherInfo{}
	resp, err := http.Get(url)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	defer resp.Body.Close()

	json.NewDecoder(resp.Body).Decode(forecast)

	if resp.StatusCode != 200 {
		w.WriteHeader(resp.StatusCode)
		sendJson(w, forecast)
		return
	}

	sendJson(w, forecast)
}
