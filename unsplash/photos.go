package unsplash

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// UnsplashAPILocation represents the base URL for requests to Unsplash's API
const UnsplashAPILocation = "https://api.unsplash.com"

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
	ID string `json:"id,omitempty"`
}

// randomPhoto represents the result from fetching a random photo from Unsplash
type randomPhoto struct {
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

// randomPhotoWithBase64 respresents the base64 encoding of randomPhoto
type randomPhotoBase64 struct {
	*randomPhoto
	Base64 string `json:"base64,omitempty"`
}

// DownloadPhoto is triggered each time a download is attempted
func DownloadPhoto(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	id := values.Get("id")
	if id == "" {
		return utils.NewHTTPError(
			nil,
			http.StatusBadRequest,
			"Photo ID must not be empty",
		)
	}

	_, err = TrackPhotoDownload(id)
	if err != nil {
		return err
	}

	w.WriteHeader(http.StatusOK)
	return nil
}

// TrackPhotoDownload is used to increment the number of downloads
// for the specified photo
func TrackPhotoDownload(id string) ([]byte, error) {
	unsplashAccessKey := config.Conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/photos/%s/download?client_id=%s",
		UnsplashAPILocation,
		id,
		unsplashAccessKey,
	)

	return utils.SendGETRequest(url, &download{})
}

// SearchUnsplash triggers a photo search and sends a single page of photo
// results for a query.
func SearchUnsplash(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	key := values.Get("key")
	page := values.Get("page")

	unsplashAccessKey := config.Conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/search/photos?page=%s&query=%s&per_page=%s&client_id=%s",
		UnsplashAPILocation,
		page,
		key,
		"28",
		unsplashAccessKey,
	)

	s := &searchResult{}

	bs, err := utils.SendGETRequest(url, s)
	if err != nil {
		return err
	}

	return utils.JSONResponse(w, bs)
}

// GetRandomPhoto retrives a single random photo using the provided collection
// IDs to narrow the pool of photos from which a random one will be chosen.
// If no collection IDs are present, it defaults to 998309 which is the ID of
// the official Stellar Photos collection
func GetRandomPhoto(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := values.Get("collections")
	if collections == "" {
		collections = "998309"
	}

	resolution := values.Get("resolution")

	unsplashAccessKey := config.Conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/photos/random?collections=%s&client_id=%s",
		UnsplashAPILocation,
		collections,
		unsplashAccessKey,
	)

	res := &randomPhoto{}

	_, err = utils.SendGETRequest(url, res)
	if err != nil {
		return err
	}

	var imageWidth = "2000"
	switch resolution {
	case "high":
		highRes := 4000
		if res.Width >= highRes {
			imageWidth = "4000"
		} else {
			imageWidth = strconv.Itoa(res.Width)
		}
	case "max":
		imageWidth = strconv.Itoa(res.Width)
	}

	imageURL := res.Urls.Raw + "&w=" + imageWidth

	base64, err := utils.ImageURLToBase64(imageURL)
	if err != nil {
		return err
	}

	data := randomPhotoBase64{
		res,
		base64,
	}

	bytes, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return utils.JSONResponse(w, bytes)
}

// ValidateCollections ensures that all the custom collection IDs that are added
// to the extension are valid
func ValidateCollections(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := strings.Split(values.Get("collections"), ",")

	if len(collections) == 0 {
		return utils.NewHTTPError(
			nil,
			http.StatusBadRequest,
			"At least one collection ID must be present",
		)
	}

	unsplashAccessKey := config.Conf.Unsplash.AccessKey

	for _, value := range collections {
		url := fmt.Sprintf(
			"%s/collections/%s/?client_id=%s",
			UnsplashAPILocation,
			value,
			unsplashAccessKey,
		)
		_, err = utils.SendGETRequest(url, &collection{})
		if err != nil {
			return err
		}
	}

	w.WriteHeader(http.StatusOK)
	return nil
}
