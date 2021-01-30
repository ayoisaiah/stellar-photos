package weather

import (
	"fmt"
	"net/http"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// weatherInfo represents the result of requesting the current weather forecast
// from openweathermap
type weatherInfo struct {
	Name string `json:"name"`
	Main struct {
		Temp float64 `json:"temp"`
	} `json:"main"`
	Weather   []interface{} `json:"weather"`
	Timestamp int           `json:"dt"`
}

// GetForecast retrieves the current weather forecast for a locale
func GetForecast(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	latitide := values.Get("lat")
	longitude := values.Get("lon")
	metric := values.Get("metric")

	id := config.Conf.OpenWeatherMap.AppID
	url := fmt.Sprintf("http://api.openweathermap.org/data/2.5/weather?lat=%s&lon=%s&units=%s&appid=%s", latitide, longitude, metric, id)

	forecast := &weatherInfo{}

	bytes, err := utils.SendGETRequest(url, forecast)
	if err != nil {
		return err
	}

	return utils.JsonResponse(w, bytes)
}
