package unsplash

type Download struct {
	URL string `json:"url,omitempty"`
}

type Search struct {
	Total       int           `json:"total,omitempty"`
	Total_pages int           `json:"total_pages,omitempty"`
	Results     []interface{} `json:"results,omitempty"`
}

type Collection struct {
	Id int `json:"id,omitempty"`
}

type RandomPhoto struct {
	Id          string                 `json:"id,omitempty"`
	Created_at  string                 `json:"created_at,omitempty"`
	Updated_at  string                 `json:"updated_at,omitempty"`
	Width       int                    `json:"width,omitempty"`
	Height      int                    `json:"height,omitempty"`
	Color       string                 `json:"color,omitempty"`
	Downloads   int                    `json:"downloads,omitempty"`
	Likes       int                    `json:"likes,omitempty"`
	Description string                 `json:"description,omitempty"`
	Exif        map[string]interface{} `json:"exif,omitempty"`
	Urls        map[string]interface{} `json:"urls,omitempty"`
	Links       map[string]interface{} `json:"links,omitempty"`
	User        map[string]interface{} `json:"user,omitempty"`
}

type RandomPhotoWithBase64 struct {
	Base64 string `json:"base64,omitempty"`
}

type UnsplashResponse struct {
	Errors []interface{} `json:"errors,omitempty"`
	Download
	RandomPhoto
	RandomPhotoWithBase64
	Search
}
