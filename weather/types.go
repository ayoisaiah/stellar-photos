package weather

// weatherInfo represents the result of requesting the current weather forcast
// for a locale
type weatherInfo struct {
	Name string `json:"name"`
	Main struct {
		Temp float64 `json:"temp"`
	} `json:"main"`
	Weather   []interface{} `json:"weather"`
	Timestamp int           `json:"dt"`
}
