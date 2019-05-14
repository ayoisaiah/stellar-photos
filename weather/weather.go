package weather

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/ayoisaiah/stellar-photos-server/utils"
)

func GetForecast(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

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
		utils.InternalServerError(w)
		return
	}

	defer resp.Body.Close()

	json.NewDecoder(resp.Body).Decode(forecast)

	if resp.StatusCode != 200 {
		w.WriteHeader(resp.StatusCode)
		return
	}

	utils.SendJson(w, forecast)
}
