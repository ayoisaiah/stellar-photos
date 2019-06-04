package unsplash

// download represents the result from triggering a download on a photo
type download struct {
	URL string `json:"url,omitempty"`
}

// searchResult represents the result for a search for photos.
type searchResult struct {
	Total      int           `json:"total,omitempty"`
	TotalPages int           `json:"total_pages,omitempty"`
	Results    []interface{} `json:"results,omitempty"`
}

// collection respresents a single Unsplash collection ID
type collection struct {
	ID int `json:"id,omitempty"`
}

// randomPhoto represents the result from fetching a random photo from Unsplash
type randomPhoto struct {
	ID          string                 `json:"id,omitempty"`
	CreatedAt   string                 `json:"created_at,omitempty"`
	UpdatedAt   string                 `json:"updated_at,omitempty"`
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

// randomPhotoWithBase64 respresents the base64 encoding of randomPhoto
type randomPhotoBase64 struct {
	Base64 string `json:"base64,omitempty"`
}

// unsplashResponse the entire range of responses that can be expected from
// Unsplash
type unsplashResponse struct {
	Errors []interface{} `json:"errors,omitempty"`
	download
	randomPhoto
	randomPhotoBase64
	searchResult
}
