package requests

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// SavePhotoToCloud represents a request to upload an image to either
// Google Drive or Dropbox.
type SavePhotoToCloud struct {
	Token   string `json:"-"`
	ImageID string `json:"image_id"`
	URL     string `json:"url"`
}

func (p *SavePhotoToCloud) LogValue() slog.Value {
	return slog.GroupValue(slog.String("image_id", p.ImageID))
}

func (p *SavePhotoToCloud) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	p.Token = strings.TrimSpace(values.Get("token"))
	p.ImageID = strings.TrimSpace(values.Get("id"))
	p.URL = strings.TrimSpace(values.Get("url"))

	return p.validate()
}

func (p *SavePhotoToCloud) validate() error {
	if p.Token == "" {
		return apperror.ErrTokenRequired
	}

	if p.ImageID == "" {
		return apperror.ErrImageIDRequired
	}

	if p.URL == "" {
		return apperror.ErrImageURLRequired
	}

	return nil
}
