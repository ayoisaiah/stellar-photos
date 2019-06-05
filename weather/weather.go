package weather

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// GetForecast retrieves the current weather forcast for a locale
func GetForecast(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	latitide := values.Get("lat")
	longitude := values.Get("lon")
	metric := values.Get("metric")

	id := os.Getenv("OPENWEATHER_APPID")
	url := fmt.Sprintf("http://api.openweathermap.org/data/2.5/weather?lat=%s&lon=%s&units=%s&appid=%s", latitide, longitude, metric, id)

	forecast := &weatherInfo{}
	resp, err := http.Get(url)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	defer resp.Body.Close()

	json.NewDecoder(resp.Body).Decode(forecast)

	if resp.StatusCode != 200 {
		w.WriteHeader(resp.StatusCode)
		return
	}

	utils.SendJSON(w, forecast)
}
