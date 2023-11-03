package requests

import (
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

// DownloadPhoto represents a request to download an Unsplash image.
type DownloadPhoto struct {
	ID string `json:"-"`
}

func (d *DownloadPhoto) Init(r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	d.ID = values.Get("id")

	return d.validate()
}

func (d *DownloadPhoto) validate() error {
	if d.ID == "" {
		return apperror.ErrEmptyPhotoID
	}

	return nil
}
