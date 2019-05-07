package main

type Download struct {
	URL string `json:"url"`
}

type Search struct {
	Total       int           `json:"total"`
	Total_pages int           `json:"total_pages"`
	Results     []interface{} `json:"results"`
}

type Collection struct {
	Id int `json:"id"`
}

type RandomPhoto struct {
	Id          string                 `json:"id"`
	Created_at  string                 `json:"created_at"`
	Updated_at  string                 `json:"updated_at"`
	Width       int                    `json:"width"`
	Height      int                    `json:"height"`
	Color       string                 `json:"color"`
	Downloads   int                    `json:"downloads"`
	Likes       int                    `json:"likes"`
	Description string                 `json:"description"`
	Exif        map[string]interface{} `json:"exif"`
	Urls        map[string]interface{} `json:"urls"`
	Links       map[string]interface{} `json:"links"`
	User        map[string]interface{} `json:"user"`
}

type RandomPhotoWithBase64 struct {
	RandomPhoto
	Base64 string `json:"base64"`
}

type OnedriveId struct {
	Id string `json:"id"`
}

type OnedriveAuth struct {
	Token_type    string `json:"token_type"`
	Expires_in    string `json:"expires_in"`
	Scope         string `json:"scope"`
	Access_token  string `json:"access_token"`
	Refresh_token string `json:"refresh_token"`
}

type Key struct {
	Dropbox_key string `json:"dropbox_key"`
}

type WeatherInfo struct {
	Name string `json:"name"`
	Main struct {
		Temp float64 `json:"temp"`
	}
	Weather   []interface{} `json:"weather"`
	Timestamp int           `json:"dt"`
}
