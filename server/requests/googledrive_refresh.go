package requests

import (
	"errors"
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

type RefreshGoogleDriveToken struct {
	Token string `json:"-"`
}

func (g *RefreshGoogleDriveToken) Init(r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	g.Token = strings.TrimSpace(values.Get("refresh_token"))

	return g.validate()
}

func (g *RefreshGoogleDriveToken) validate() error {
	if g.Token == "" {
		// TODO: return error
		return errors.New("refresh token not specified")
	}

	return nil
}
