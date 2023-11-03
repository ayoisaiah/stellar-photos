package requests

import (
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

var errEmptyCollectionID = &utils.HTTPError{
	Detail: "At least one collection ID must be present",
	Status: http.StatusBadRequest,
}

// UnsplashCollections represents a request to validate the provided collection
// IDs.
type UnsplashCollections struct {
	Collections []string `json:"-"`
}

func (u *UnsplashCollections) Init(r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := strings.Split(values.Get("collections"), ",")

	u.Collections = collections

	return u.validate()
}

func (u *UnsplashCollections) validate() error {
	if len(u.Collections) == 0 {
		return errEmptyCollectionID
	}

	return nil
}
