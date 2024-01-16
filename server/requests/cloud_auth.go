package requests

import (
	"log/slog"
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// CloudAuth represents a request to authorize Google Drive or OneDrive account
type CloudAuth struct {
	Code string `json:"code"`
}

func (c *CloudAuth) LogValue() slog.Value {
	return slog.Value{}
}

func (c *CloudAuth) Init(r *http.Request) error {
	err := decodeJSON(r.Body, c)
	if err != nil {
		return err
	}

	return c.validate()
}

func (c *CloudAuth) validate() error {
	if c.Code == "" {
		return apperror.ErrAuthCodeRequired
	}

	return nil
}
