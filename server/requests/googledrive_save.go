package requests

import (
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

type SavePhotoToDrive struct {
	Token string `json:"-"`
	ImageID    string `json:"-"`
	URL   string `json:"-"`
}

func (p *SavePhotoToDrive) Init(r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	p.Token = strings.TrimSpace(values.Get("token"))
	p.ImageID = strings.TrimSpace(values.Get("id"))
	p.URL = strings.TrimSpace(values.Get("url"))

	return p.validate()
}

func (p *SavePhotoToDrive) validate() error {
	// TODO: validate

	return nil
}
