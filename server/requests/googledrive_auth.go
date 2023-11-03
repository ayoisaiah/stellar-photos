package requests

import (
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

type GoogleDriveAuth struct {
	Code string `json:"-"`
}

func (g *GoogleDriveAuth) Init(r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	g.Code = strings.TrimSpace(values.Get("code"))

	return g.validate()
}

func (g *GoogleDriveAuth) validate() error {
	if g.Code == "" {
		// TODO: Return an error
	}

	return nil
}
