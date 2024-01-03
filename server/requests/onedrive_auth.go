package requests

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

type OneDriveAuth struct {
	Code string `json:"-"`
}

func (o *OneDriveAuth) LogValue() slog.Value {
	return slog.Value{}
}

func (o *OneDriveAuth) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	o.Code = strings.TrimSpace(values.Get("code"))

	return o.validate()
}

func (o *OneDriveAuth) validate() error {
	if o.Code == "" {
		return apperror.ErrAuthCodeRequired
	}

	return nil
}
