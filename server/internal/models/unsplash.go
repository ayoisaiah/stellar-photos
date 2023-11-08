package models

import "time"

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

// UnsplashTopic represents a topic on Unsplash.
type UnsplashTopic struct {
	CoverPhoto struct {
		AltDescription         string    `json:"alt_description"`
		BlurHash               string    `json:"blur_hash"`
		Breadcrumbs            []any     `json:"breadcrumbs"`
		Color                  string    `json:"color"`
		CreatedAt              time.Time `json:"created_at"`
		CurrentUserCollections []any     `json:"current_user_collections"`
		Description            string    `json:"description"`
		Height                 int       `json:"height"`
		ID                     string    `json:"id"`
		LikedByUser            bool      `json:"liked_by_user"`
		Likes                  int       `json:"likes"`
		Links                  struct {
			Download         string `json:"download"`
			DownloadLocation string `json:"download_location"`
			HTML             string `json:"html"`
			Self             string `json:"self"`
		} `json:"links"`
		PromotedAt       time.Time `json:"promoted_at"`
		Slug             string    `json:"slug"`
		Sponsorship      any       `json:"sponsorship"`
		TopicSubmissions struct {
			ArchitectureInterior struct {
				Status string `json:"status"`
			} `json:"architecture-interior"`
			Travel struct {
				ApprovedOn time.Time `json:"approved_on"`
				Status     string    `json:"status"`
			} `json:"travel"`
			Wallpapers struct {
				ApprovedOn time.Time `json:"approved_on"`
				Status     string    `json:"status"`
			} `json:"wallpapers"`
		} `json:"topic_submissions"`
		UpdatedAt time.Time `json:"updated_at"`
		Urls      struct {
			Full    string `json:"full"`
			Raw     string `json:"raw"`
			Regular string `json:"regular"`
			Small   string `json:"small"`
			SmallS3 string `json:"small_s3"`
			Thumb   string `json:"thumb"`
		} `json:"urls"`
		User struct {
			AcceptedTos       bool   `json:"accepted_tos"`
			Bio               string `json:"bio"`
			FirstName         string `json:"first_name"`
			ForHire           bool   `json:"for_hire"`
			ID                string `json:"id"`
			InstagramUsername string `json:"instagram_username"`
			LastName          any    `json:"last_name"`
			Links             struct {
				Followers string `json:"followers"`
				Following string `json:"following"`
				HTML      string `json:"html"`
				Likes     string `json:"likes"`
				Photos    string `json:"photos"`
				Portfolio string `json:"portfolio"`
				Self      string `json:"self"`
			} `json:"links"`
			Location     string `json:"location"`
			Name         string `json:"name"`
			PortfolioURL string `json:"portfolio_url"`
			ProfileImage struct {
				Large  string `json:"large"`
				Medium string `json:"medium"`
				Small  string `json:"small"`
			} `json:"profile_image"`
			Social struct {
				InstagramUsername string `json:"instagram_username"`
				PaypalEmail       any    `json:"paypal_email"`
				PortfolioURL      string `json:"portfolio_url"`
				TwitterUsername   any    `json:"twitter_username"`
			} `json:"social"`
			TotalCollections int       `json:"total_collections"`
			TotalLikes       int       `json:"total_likes"`
			TotalPhotos      int       `json:"total_photos"`
			TwitterUsername  any       `json:"twitter_username"`
			UpdatedAt        time.Time `json:"updated_at"`
			Username         string    `json:"username"`
		} `json:"user"`
		Width int `json:"width"`
	} `json:"cover_photo"`
	CurrentUserContributions []any  `json:"current_user_contributions"`
	Description              string `json:"description"`
	EndsAt                   any    `json:"ends_at"`
	Featured                 bool   `json:"featured"`
	ID                       string `json:"id"`
	Links                    struct {
		HTML   string `json:"html"`
		Photos string `json:"photos"`
		Self   string `json:"self"`
	} `json:"links"`
	OnlySubmissionsAfter any `json:"only_submissions_after"`
	Owners               []struct {
		AcceptedTos       bool   `json:"accepted_tos"`
		Bio               string `json:"bio"`
		FirstName         string `json:"first_name"`
		ForHire           bool   `json:"for_hire"`
		ID                string `json:"id"`
		InstagramUsername string `json:"instagram_username"`
		LastName          any    `json:"last_name"`
		Links             struct {
			Followers string `json:"followers"`
			Following string `json:"following"`
			HTML      string `json:"html"`
			Likes     string `json:"likes"`
			Photos    string `json:"photos"`
			Portfolio string `json:"portfolio"`
			Self      string `json:"self"`
		} `json:"links"`
		Location     string `json:"location"`
		Name         string `json:"name"`
		PortfolioURL string `json:"portfolio_url"`
		ProfileImage struct {
			Large  string `json:"large"`
			Medium string `json:"medium"`
			Small  string `json:"small"`
		} `json:"profile_image"`
		Social struct {
			InstagramUsername string `json:"instagram_username"`
			PaypalEmail       any    `json:"paypal_email"`
			PortfolioURL      string `json:"portfolio_url"`
			TwitterUsername   string `json:"twitter_username"`
		} `json:"social"`
		TotalCollections int       `json:"total_collections"`
		TotalLikes       int       `json:"total_likes"`
		TotalPhotos      int       `json:"total_photos"`
		TwitterUsername  string    `json:"twitter_username"`
		UpdatedAt        time.Time `json:"updated_at"`
		Username         string    `json:"username"`
	} `json:"owners"`
	PreviewPhotos []struct {
		BlurHash  string    `json:"blur_hash"`
		CreatedAt time.Time `json:"created_at"`
		ID        string    `json:"id"`
		Slug      string    `json:"slug"`
		UpdatedAt time.Time `json:"updated_at"`
		Urls      struct {
			Full    string `json:"full"`
			Raw     string `json:"raw"`
			Regular string `json:"regular"`
			Small   string `json:"small"`
			SmallS3 string `json:"small_s3"`
			Thumb   string `json:"thumb"`
		} `json:"urls"`
	} `json:"preview_photos"`
	PublishedAt     time.Time `json:"published_at"`
	Slug            string    `json:"slug"`
	StartsAt        time.Time `json:"starts_at"`
	Status          string    `json:"status"`
	Title           string    `json:"title"`
	TopContributors []struct {
		AcceptedTos       bool   `json:"accepted_tos"`
		Bio               string `json:"bio"`
		FirstName         string `json:"first_name"`
		ForHire           bool   `json:"for_hire"`
		ID                string `json:"id"`
		InstagramUsername string `json:"instagram_username"`
		LastName          string `json:"last_name"`
		Links             struct {
			Followers string `json:"followers"`
			Following string `json:"following"`
			HTML      string `json:"html"`
			Likes     string `json:"likes"`
			Photos    string `json:"photos"`
			Portfolio string `json:"portfolio"`
			Self      string `json:"self"`
		} `json:"links"`
		Location     string `json:"location"`
		Name         string `json:"name"`
		PortfolioURL string `json:"portfolio_url"`
		ProfileImage struct {
			Large  string `json:"large"`
			Medium string `json:"medium"`
			Small  string `json:"small"`
		} `json:"profile_image"`
		Social struct {
			InstagramUsername string `json:"instagram_username"`
			PaypalEmail       any    `json:"paypal_email"`
			PortfolioURL      string `json:"portfolio_url"`
			TwitterUsername   any    `json:"twitter_username"`
		} `json:"social"`
		TotalCollections int       `json:"total_collections"`
		TotalLikes       int       `json:"total_likes"`
		TotalPhotos      int       `json:"total_photos"`
		TwitterUsername  any       `json:"twitter_username"`
		UpdatedAt        time.Time `json:"updated_at"`
		Username         string    `json:"username"`
	} `json:"top_contributors"`
	TotalCurrentUserSubmissions any       `json:"total_current_user_submissions"`
	TotalPhotos                 int       `json:"total_photos"`
	UpdatedAt                   time.Time `json:"updated_at"`
	Visibility                  string    `json:"visibility"`
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
	Base64    string `json:"base64,omitempty"` // Not part of the Unsplash API response
}
