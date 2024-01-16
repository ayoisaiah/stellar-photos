package requests

import (
	"log/slog"
	"net/http"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// RefreshToken represents a request to refresh a Google Drive or OneDrive
// access token
type RefreshToken struct {
	Token string `json:"token"`
}

func (t *RefreshToken) LogValue() slog.Value {
	return slog.Value{}
}

func (t *RefreshToken) Init(r *http.Request) error {
	err := decodeJSON(r.Body, t)
	if err != nil {
		return err
	}

	return t.validate()
}

func (t *RefreshToken) validate() error {
	if t.Token == "" {
		return apperror.ErrRefreshTokenRequired
	}

	return nil
}
