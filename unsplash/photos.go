package unsplash

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// UnsplashAPILocation represents the base URL for requests to Unsplash's API
const UnsplashAPILocation = "https://api.unsplash.com"

// DownloadPhoto gets the request photo's download link and sends it to the
// client
func DownloadPhoto(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	id := values.Get("id")

	data, err := GetPhotoDownloadLocation(id)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	jsonResponse(w, data)
}

// GetPhotoDownloadLocation retrives the download link of the photo whose ID is
// provided
func GetPhotoDownloadLocation(id string) (*unsplashResponse, error) {
	unsplashAccessKey := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/photos/%s/download?client_id=%s", UnsplashAPILocation, id, unsplashAccessKey)

	s := &unsplashResponse{}
	err := utils.SendRequestToUnsplash(url, s)

	return s, err
}

// SearchUnsplash triggers a photo search and sends a single page of photo
// results for a query.
func SearchUnsplash(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	key := values.Get("key")
	page := values.Get("page")

	unsplashAccessKey := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/search/photos?page=%s&query=%s&per_page=%s&client_id=%s", UnsplashAPILocation, page, key, "28", unsplashAccessKey)

	s := &unsplashResponse{}
	err = utils.SendRequestToUnsplash(url, s)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	jsonResponse(w, s)
}

// GetRandomPhoto retrives a single random photo using the provided collection
// IDs to narrow the pool of photos from which a random one will be chosen.
// If no collection IDs are present, it defaults to 998309 which is the ID of
// the official Stellar Photos collection
func GetRandomPhoto(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	collections := values.Get("collections")

	if collections == "" {
		collections = "998309"
	}

	width := 2000

	unsplashAccessKey := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/photos/random?collections=%s&w=%d&client_id=%s", UnsplashAPILocation, collections, width, unsplashAccessKey)

	s := &unsplashResponse{}
	err = utils.SendRequestToUnsplash(url, s)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	imageURL := s.Urls["custom"].(string)

	base64, err := utils.ImageURLToBase64(imageURL)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	x := randomPhotoBase64{
		Base64: base64,
	}

	data := &unsplashResponse{
		randomPhoto:       s.randomPhoto,
		randomPhotoBase64: x,
	}

	jsonResponse(w, data)
}

// ValidateCollections ensures that all the custom collection IDs that are added
// to the extension are valid
func ValidateCollections(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	collections := strings.Split(values.Get("collections"), ",")

	unsplashAccessKey := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))

	for _, value := range collections {
		url := fmt.Sprintf("%s/collections/%s/?client_id=%s", UnsplashAPILocation, value, unsplashAccessKey)
		c := &collection{}
		err := utils.SendRequestToUnsplash(url, c)

		if err != nil {
			utils.InternalServerError(w)
			return
		}

		if c.ID == 0 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("200 - Collections are valid"))
}

func jsonResponse(w http.ResponseWriter, target *unsplashResponse) error {
	w.Header().Set("Content-Type", "application/json")

	if target.Errors != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return json.NewEncoder(w).Encode(target)
	}

	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(target)
}
