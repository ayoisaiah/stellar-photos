package requests

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type GoogleDriveAuth struct {
	Code string `json:"-"`
}

func (g *GoogleDriveAuth) LogValue() slog.Value {
	return slog.Value{}
}

func (g *GoogleDriveAuth) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	g.Code = strings.TrimSpace(values.Get("code"))

	return g.validate()
}

func (g *GoogleDriveAuth) validate() error {
	if g.Code == "" {
		return apperror.ErrAuthCodeRequired
	}

	return nil
}
