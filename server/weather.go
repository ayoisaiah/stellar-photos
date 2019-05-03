package main

import (
  "net/http"
  "fmt"
  "os"
)

type WeatherInfo struct {
  Name string `json:"name"`
  Main struct {
    Temp float64 `json:"temp"`
  }
  Weather []interface{} `json:"weather"`
  Timestamp int `json:"dt"`
}

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

  forecast := new(WeatherInfo)
  err = getJson(url, forecast)

  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    return
  }

  sendJson(w, forecast)
}
