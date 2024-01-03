package requests

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type RefreshOneDriveToken struct {
	Token string `json:"-"`
}

func (o *RefreshOneDriveToken) LogValue() slog.Value {
	return slog.Value{}
}

func (o *RefreshOneDriveToken) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	o.Token = strings.TrimSpace(values.Get("refresh_token"))

	return o.validate()
}

func (o *RefreshOneDriveToken) validate() error {
	if o.Token == "" {
		return apperror.ErrRefreshTokenRequired
	}

	return nil
}
