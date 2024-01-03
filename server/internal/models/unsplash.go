package models

import "time"

// UnsplashDownload represents the result from triggering a download on a photo.
type UnsplashDownload struct {
	URL string `json:"url"`
}

// UnsplashSearchResult represents the search results for a query.
type UnsplashSearchResult struct {
	Results    []interface{} `json:"results,omitempty"`
	Total      int           `json:"total,omitempty"`
	TotalPages int           `json:"total_pages,omitempty"`
}

// UnsplashCollection respresents a single Unsplash collection.
type UnsplashCollection struct {
	CoverPhoto any `json:"cover_photo"`
	User       any `json:"user"`
	Links      struct {
		Self   string `json:"self"`
		HTML   string `json:"html"`
		Photos string `json:"photos"`
	} `json:"links"`
	ID              string `json:"id"`
	LastCollectedAt string `json:"last_collected_at"`
	UpdatedAt       string `json:"updated_at"`
	PublishedAt     string `json:"published_at"`
	Description     string `json:"description"`
	Title           string `json:"title"`
	ShareKey        string `json:"share_key"`
	TotalPhotos     int    `json:"total_photos"`
	Private         bool   `json:"private"`
	Featured        bool   `json:"featured"`
}

// UnsplashTopic represents a topic on Unsplash.
type UnsplashTopic struct {
	PublishedAt          time.Time `json:"published_at"`
	StartsAt             time.Time `json:"starts_at"`
	OnlySubmissionsAfter any       `json:"only_submissions_after"`
	EndsAt               any       `json:"ends_at"`
	Links                struct {
		Self   string `json:"self"`
		HTML   string `json:"html"`
		Photos string `json:"photos"`
	} `json:"links"`
	ID          string `json:"id"`
	Description string `json:"description"`
	UpdatedAt   string `json:"updated_at"`
	Slug        string `json:"slug"`
	Visibility  string `json:"visibility"`
	Status      string `json:"status"`
	Title       string `json:"title"`
	Owners      []struct {
		ID              string `json:"id"`
		UpdatedAt       string `json:"updated_at"`
		Username        string `json:"username"`
		Name            string `json:"name"`
		FirstName       string `json:"first_name"`
		LastName        any    `json:"last_name"`
		TwitterUsername string `json:"twitter_username"`
		PortfolioURL    string `json:"portfolio_url"`
		Bio             string `json:"bio"`
		Location        string `json:"location"`
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
	} `json:"owners"`
	TopContributors []struct {
		ID              string `json:"id"`
		UpdatedAt       string `json:"updated_at"`
		Username        string `json:"username"`
		Name            string `json:"name"`
		FirstName       string `json:"first_name"`
		LastName        any    `json:"last_name"`
		TwitterUsername string `json:"twitter_username"`
		PortfolioURL    string `json:"portfolio_url"`
		Bio             string `json:"bio"`
		Location        string `json:"location"`
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
	} `json:"top_contributors"`
	CoverPhoto struct {
		PromotedAt any `json:"promoted_at"`
		Urls       struct {
			Raw     string `json:"raw"`
			Full    string `json:"full"`
			Regular string `json:"regular"`
			Small   string `json:"small"`
			Thumb   string `json:"thumb"`
		} `json:"urls"`
		Links struct {
			Self             string `json:"self"`
			HTML             string `json:"html"`
			Download         string `json:"download"`
			DownloadLocation string `json:"download_location"`
		} `json:"links"`
		ID             string `json:"id"`
		UpdatedAt      string `json:"updated_at"`
		CreatedAt      string `json:"created_at"`
		Color          string `json:"color"`
		BlurHash       string `json:"blur_hash"`
		Description    string `json:"description"`
		AltDescription string `json:"alt_description"`
		PreviewPhotos  []struct {
			ID        string `json:"id"`
			CreatedAt string `json:"created_at"`
			UpdatedAt string `json:"updated_at"`
			Urls      struct {
				Raw     string `json:"raw"`
				Full    string `json:"full"`
				Regular string `json:"regular"`
				Small   string `json:"small"`
				Thumb   string `json:"thumb"`
			} `json:"urls"`
		} `json:"preview_photos"`
		User struct {
			ID              string `json:"id"`
			UpdatedAt       string `json:"updated_at"`
			Username        string `json:"username"`
			Name            string `json:"name"`
			FirstName       string `json:"first_name"`
			LastName        any    `json:"last_name"`
			TwitterUsername string `json:"twitter_username"`
			PortfolioURL    string `json:"portfolio_url"`
			Bio             string `json:"bio"`
			Location        string `json:"location"`
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
		Height int `json:"height"`
		Width  int `json:"width"`
	} `json:"cover_photo"`
	TotalPhotos int  `json:"total_photos"`
	Featured    bool `json:"featured"`
}

// UnsplashPhoto represents a single photo on Unsplash.with an additional Base64
// field.
type UnsplashPhoto struct {
	Urls struct {
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
	AltDescription string `json:"alt_description"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
	PromotedAt     string `json:"promoted_at"`
	Color          string `json:"color"`
	BlurHash       string `json:"blur_hash"`
	Description    string `json:"description"`
	ID             string `json:"id"`
	Base64         string `json:"base64,omitempty"`
	Exif           struct {
		Make         string `json:"make"`
		Model        string `json:"model"`
		ExposureTime string `json:"exposure_time"`
		Aperture     string `json:"aperture"`
		FocalLength  string `json:"focal_length"`
		Iso          int    `json:"iso"`
	} `json:"exif"`
	Categories             []interface{} `json:"categories"`
	CurrentUserCollections []interface{} `json:"current_user_collections"`
	Location               struct {
		Title    string `json:"title"`
		Name     string `json:"name"`
		City     string `json:"city"`
		Country  string `json:"country"`
		Position struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"position"`
	} `json:"location"`
	User struct {
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
	Likes       int  `json:"likes"`
	Downloads   int  `json:"downloads"`
	Height      int  `json:"height"`
	Width       int  `json:"width"`
	Views       int  `json:"views"`
	LikedByUser bool `json:"liked_by_user"`
}

type UnsplashUser struct {
	PortfolioURL any `json:"portfolio_url"`
	Links        struct {
		Self      string `json:"self"`
		HTML      string `json:"html"`
		Photos    string `json:"photos"`
		Likes     string `json:"likes"`
		Portfolio string `json:"portfolio"`
	} `json:"links"`
	ProfileImage struct {
		Small  string `json:"small"`
		Medium string `json:"medium"`
		Large  string `json:"large"`
	} `json:"profile_image"`
	Social struct {
		InstagramUsername string `json:"instagram_username"`
		PortfolioURL      string `json:"portfolio_url"`
		TwitterUsername   string `json:"twitter_username"`
	} `json:"social"`
	TwitterUsername   string `json:"twitter_username"`
	LastName          string `json:"last_name"`
	InstagramUsername string `json:"instagram_username"`
	FirstName         string `json:"first_name"`
	Name              string `json:"name"`
	Bio               string `json:"bio"`
	Location          string `json:"location"`
	ID                string `json:"id"`
	UpdatedAt         string `json:"updated_at"`
	Username          string `json:"username"`
	Badge             struct {
		Title   string `json:"title"`
		Slug    string `json:"slug"`
		Link    string `json:"link"`
		Primary bool   `json:"primary"`
	} `json:"badge"`
	FollowersCount   int  `json:"followers_count"`
	FollowingCount   int  `json:"following_count"`
	Downloads        int  `json:"downloads"`
	TotalCollections int  `json:"total_collections"`
	TotalPhotos      int  `json:"total_photos"`
	TotalLikes       int  `json:"total_likes"`
	FollowedByUser   bool `json:"followed_by_user"`
}
