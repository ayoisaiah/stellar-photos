package weather

type WeatherInfo struct {
	Name string `json:"name"`
	Main struct {
		Temp float64 `json:"temp"`
	} `json:"main"`
	Weather   []interface{} `json:"weather"`
	Timestamp int           `json:"dt"`
}
