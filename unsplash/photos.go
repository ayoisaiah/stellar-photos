package unsplash

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/ayoisaiah/stellar-photos-server/utils"
)

const UnsplashApiUrl = "https://api.unsplash.com"

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

func GetPhotoDownloadLocation(id string) (*UnsplashResponse, error) {
	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/photos/%s/download?client_id=%s", UnsplashApiUrl, id, UnsplashBaseUrl)

	s := &UnsplashResponse{}
	err := utils.GetJson(url, s)

	return s, err
}

func SearchUnsplash(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	key := values.Get("key")
	page := values.Get("page")

	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/search/photos?page=%s&query=%s&per_page=%s&client_id=%s", UnsplashApiUrl, page, key, "28", UnsplashBaseUrl)

	s := &UnsplashResponse{}
	err = utils.GetJson(url, s)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	jsonResponse(w, s)
}

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

	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))
	url := fmt.Sprintf("%s/photos/random?collections=%s&w=%d&client_id=%s", UnsplashApiUrl, collections, width, UnsplashBaseUrl)

	s := &UnsplashResponse{}
	err = utils.GetJson(url, s)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	imageUrl := s.Urls["custom"].(string)

	base64, err := utils.ImageUrlToBase64(imageUrl)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	x := RandomPhotoWithBase64{
		Base64: base64,
	}

	data := &UnsplashResponse{
		RandomPhoto:           s.RandomPhoto,
		RandomPhotoWithBase64: x,
	}

	jsonResponse(w, data)
}

func ValidateCollections(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	collections := strings.Split(values.Get("collections"), ",")

	UnsplashBaseUrl := fmt.Sprintf("%s", os.Getenv("UNSPLASH_ACCESS_KEY"))

	for _, value := range collections {
		url := fmt.Sprintf("%s/collections/%s/?client_id=%s", UnsplashApiUrl, value, UnsplashBaseUrl)
		c := &Collection{}
		err := utils.GetJson(url, c)

		if err != nil {
			utils.InternalServerError(w)
			return
		}

		if c.Id == 0 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("200 - Collections are valid"))
}

func jsonResponse(w http.ResponseWriter, target *UnsplashResponse) error {
	w.Header().Set("Content-Type", "application/json")

	if target.Errors != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return json.NewEncoder(w).Encode(target)
	}

	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(target)
}
