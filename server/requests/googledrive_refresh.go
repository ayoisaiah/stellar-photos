package requests

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type RefreshGoogleDriveToken struct {
	Token string `json:"-"`
}

func (g *RefreshGoogleDriveToken) LogValue() slog.Value {
	return slog.Value{}
}

func (g *RefreshGoogleDriveToken) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	g.Token = strings.TrimSpace(values.Get("refresh_token"))

	return g.validate()
}

func (g *RefreshGoogleDriveToken) validate() error {
	if g.Token == "" {
		return apperror.ErrRefreshTokenRequired
	}

	return nil
}
