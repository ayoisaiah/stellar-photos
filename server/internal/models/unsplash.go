package models

// UnsplashDownload represents the result from triggering a download on a photo.
type UnsplashDownload struct {
	URL string `json:"url,omitempty"` // TODO: Why omitempty?
}

// UnsplashSearchResult represents the result for a search for photos.
type UnsplashSearchResult struct {
	Total      int           `json:"total,omitempty"`
	TotalPages int           `json:"total_pages,omitempty"`
	Results    []interface{} `json:"results,omitempty"`
}

// UnsplashCollection respresents a single Unsplash collection.
type UnsplashCollection struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	PublishedAt     string `json:"published_at"`
	LastCollectedAt string `json:"last_collected_at"`
	UpdatedAt       string `json:"updated_at"`
	Curated         bool   `json:"curated"`
	Featured        bool   `json:"featured"`
	TotalPhotos     int    `json:"total_photos"`
	Private         bool   `json:"private"`
	ShareKey        string `json:"share_key"`
	Links           struct {
		Self    string `json:"self"`
		HTML    string `json:"html"`
		Photos  string `json:"photos"`
		Related string `json:"related"`
	} `json:"links"`
	Meta struct {
		Title       interface{} `json:"title"`
		Description interface{} `json:"description"`
		Index       bool        `json:"index"`
	} `json:"meta"`
}

// UnsplashPhoto represents a single photo on Unsplash.with an additional Base64
// field.
type UnsplashPhoto struct {
	ID             string `json:"id"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
	PromotedAt     string `json:"promoted_at"`
	Width          int    `json:"width"`
	Height         int    `json:"height"`
	Color          string `json:"color"`
	BlurHash       string `json:"blur_hash"`
	Description    string `json:"description"`
	AltDescription string `json:"alt_description"`
	Urls           struct {
		Raw     string `json:"raw"`
		Full    string `json:"full"`
		Regular string `json:"regular"`
		Small   string `json:"small"`
		Thumb   string `json:"thumb"`
		Custom  string `json:"custom"`
	} `json:"urls"`
	Links struct {
		Self             string `json:"self"`
		HTML             string `json:"html"`
		Download         string `json:"download"`
		DownloadLocation string `json:"download_location"`
	} `json:"links"`
	Categories             []interface{} `json:"categories"`
	Likes                  int           `json:"likes"`
	LikedByUser            bool          `json:"liked_by_user"`
	CurrentUserCollections []interface{} `json:"current_user_collections"`
	User                   struct {
		ID              string      `json:"id"`
		UpdatedAt       string      `json:"updated_at"`
		Username        string      `json:"username"`
		Name            string      `json:"name"`
		FirstName       string      `json:"first_name"`
		LastName        string      `json:"last_name"`
		TwitterUsername interface{} `json:"twitter_username"`
		PortfolioURL    string      `json:"portfolio_url"`
		Bio             string      `json:"bio"`
		Location        interface{} `json:"location"`
		Links           struct {
			Self      string `json:"self"`
			HTML      string `json:"html"`
			Photos    string `json:"photos"`
			Likes     string `json:"likes"`
			Portfolio string `json:"portfolio"`
			Following string `json:"following"`
			Followers string `json:"followers"`
		} `json:"links"`
		ProfileImage struct {
			Small  string `json:"small"`
			Medium string `json:"medium"`
			Large  string `json:"large"`
		} `json:"profile_image"`
		InstagramUsername string `json:"instagram_username"`
		TotalCollections  int    `json:"total_collections"`
		TotalLikes        int    `json:"total_likes"`
		TotalPhotos       int    `json:"total_photos"`
		AcceptedTos       bool   `json:"accepted_tos"`
	} `json:"user"`
	Exif struct {
		Make         string `json:"make"`
		Model        string `json:"model"`
		ExposureTime string `json:"exposure_time"`
		Aperture     string `json:"aperture"`
		FocalLength  string `json:"focal_length"`
		Iso          int    `json:"iso"`
	} `json:"exif"`
	Location struct {
		Title    string `json:"title"`
		Name     string `json:"name"`
		City     string `json:"city"`
		Country  string `json:"country"`
		Position struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"position"`
	} `json:"location"`
	Views     int    `json:"views"`
	Downloads int    `json:"downloads"`
	Base64    string `json:"base64,omitempty"`
}
