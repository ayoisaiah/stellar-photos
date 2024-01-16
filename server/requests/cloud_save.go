package requests

import (
	"log/slog"
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// SavePhotoToCloud represents a request to upload an image to
// Google Drive, OneDrive or Dropbox.
type SavePhotoToCloud struct {
	Token   string `json:"token"`
	ImageID string `json:"image_id"`
	URL     string `json:"url"`
}

func (p *SavePhotoToCloud) LogValue() slog.Value {
	return slog.GroupValue(slog.String("image_id", p.ImageID))
}

func (p *SavePhotoToCloud) Init(r *http.Request) error {
	err := decodeJSON(r.Body, p)
	if err != nil {
		return err
	}

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
