package stellar

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/logger"
	"github.com/ayoisaiah/stellar-photos/metrics"
)

// UnsplashAPIBaseURL represents the base URL for requests to Unsplash's API.
const UnsplashAPIBaseURL = "https://api.unsplash.com"

// download represents the result from triggering a download on a photo.
type download struct {
	URL string `json:"url,omitempty"`
}

// unsplashSearchResult represents the result for a search for photos.
type unsplashSearchResult struct {
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

// UnsplashPhoto represents a single photo on Unsplash.
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
	Views     int `json:"views"`
	Downloads int `json:"downloads"`
}

// unsplashPhotoWithBase64 respresents the base64 encoding of an Unsplash Photo.
type unsplashPhotoWithBase64 struct {
	*UnsplashPhoto
	Base64 string `json:"base64,omitempty"`
}

var (
	errEmptyPhotoID = &utils.HTTPError{
		Detail: "the photo ID must not be empty",
		Status: http.StatusBadRequest,
	}

	errEmptyCollectionID = &utils.HTTPError{
		Detail: "at least one collection ID must be present",
		Status: http.StatusBadRequest,
	}
)

// DownloadPhoto is triggered each time a download is attempted.
func DownloadPhoto(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	l := logger.FromCtx(ctx)

	l.Log(ctx, logger.LevelTrace, "photo download initated")

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	l.Debug(
		"query parameters for download request",
		slog.String("query", values.Encode()),
	)

	id := values.Get("id")
	if id == "" {
		return errEmptyPhotoID
	}

	ctx = context.WithValue(ctx, DownloadCtxKey, "local")

	_, err = TrackPhotoDownload(ctx, id)

	if err != nil {
		return err
	}

	l.Log(
		ctx,
		logger.LevelTrace,
		"download successfully initiated for photo: "+id,
		slog.String("image_id", id),
	)

	w.WriteHeader(http.StatusOK)

	return nil
}

// TrackPhotoDownload is used to increment the number of downloads
// for the specified photo.
func TrackPhotoDownload(
	ctx context.Context,
	id string,
) ([]byte, error) {
	conf := config.Get()

	l := logger.FromCtx(ctx)

	l.Log(
		ctx,
		logger.LevelTrace,
		"notify Unsplash of download intent for: "+id,
		slog.String("image_id", id),
	)

	downloadCtx, ok := ctx.Value(DownloadCtxKey).(string)
	if !ok {
		downloadCtx = "unknown"
	}

	m := metrics.Get()
	m.ImageDownload.WithLabelValues(downloadCtx)

	unsplashAccessKey := conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/photos/%s/download?client_id=%s",
		UnsplashAPIBaseURL,
		id,
		unsplashAccessKey,
	)

	return utils.SendGETRequest(ctx, url, &download{})
}

// SearchUnsplash triggers a photo search and sends a single page of photo
// results for a query.
func SearchUnsplash(w http.ResponseWriter, r *http.Request) error {
	conf := config.Get()

	ctx := r.Context()

	l := logger.FromCtx(ctx)

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	key := values.Get("key")
	page := values.Get("page")

	l.Debug("search query initated for: "+key,
		slog.String("key", key),
		slog.String("page", page),
	)

	unsplashAccessKey := conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/search/photos?page=%s&query=%s&per_page=%s&client_id=%s",
		UnsplashAPIBaseURL,
		page,
		key,
		"28",
		unsplashAccessKey,
	)

	s := &unsplashSearchResult{}

	b, err := utils.SendGETRequest(ctx, url, s)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, b)
}

// GetRandomPhoto retrives a single random photo using the provided collection
// IDs to narrow the pool of photos from which a random one will be chosen.
// If no collection IDs are present, it defaults to 998309 which is the ID of
// the official Stellar Photos collection.
func GetRandomPhoto(w http.ResponseWriter, r *http.Request) error {
	conf := config.Get()

	ctx := r.Context()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := values.Get("collections")
	if collections == "" {
		collections = "998309"
	}

	resolution := values.Get("resolution")
	if resolution == "" {
		resolution = "standard"
	}

	unsplashAccessKey := conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/photos/random?collections=%s&client_id=%s",
		UnsplashAPIBaseURL,
		collections,
		unsplashAccessKey,
	)

	photo := &UnsplashPhoto{}

	_, err = utils.SendGETRequest(ctx, url, photo)
	if err != nil {
		return fmt.Errorf("unable to fetch a random image from : %w", err)
	}

	m := metrics.Get()
	m.ResolutionCount.WithLabelValues(resolution).Inc()

	var imageWidth string

	switch resolution {
	case "standard":
		imageWidth = "2000"
	case "high":
		highRes := 4000
		if photo.Width >= highRes {
			imageWidth = "4000"
		} else {
			imageWidth = strconv.Itoa(photo.Width)
		}
	case "max":
		imageWidth = strconv.Itoa(photo.Width)
	}

	imageURL := photo.Urls.Raw + "&w=" + imageWidth

	base64, err := utils.GetImageBase64(
		r.Context(),
		imageURL,
		imageWidth,
		photo.ID,
	)
	if err != nil {
		return err
	}

	data := unsplashPhotoWithBase64{
		photo,
		base64,
	}

	b, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, b)
}

// ValidateCollections ensures that all the custom collection IDs that are added
// to the extension are valid.
func ValidateCollections(
	w http.ResponseWriter,
	r *http.Request,
) error {
	conf := config.Get()

	ctx := r.Context()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := strings.Split(values.Get("collections"), ",")

	if len(collections) == 0 {
		return errEmptyCollectionID
	}

	unsplashAccessKey := conf.Unsplash.AccessKey

	for _, value := range collections {
		url := fmt.Sprintf(
			"%s/collections/%s/?client_id=%s",
			UnsplashAPIBaseURL,
			value,
			unsplashAccessKey,
		)

		_, err = utils.SendGETRequest(ctx, url, &UnsplashCollection{})
		if err != nil {
			return err
		}
	}

	w.WriteHeader(http.StatusOK)

	return nil
}
