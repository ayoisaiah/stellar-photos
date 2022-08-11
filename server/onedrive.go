package stellar

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

// Onedrive Application ID.
type onedrive struct {
	ID string `json:"id"`
}

// onedriveAuth represents the request body after a successful authentication.
type onedriveAuth struct {
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// SendOnedriveID sends the application id to the client on request.
func (a *App) SendOnedriveID(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id := a.Config.Onedrive.AppID

	d := onedrive{
		ID: id,
	}

	b, err := json.Marshal(d)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, b)
}

// AuthorizeOnedrive redeems the authorization code received from the client for
// an access token.
func (a *App) AuthorizeOnedrive(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	code := values.Get("code")
	if code == "" {
		return errors.New("authorization code not specified")
	}

	id := a.Config.Onedrive.AppID
	secret := a.Config.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          code,
		"redirect_uri":  strings.TrimSuffix(a.Config.RedirectURL, "/"),
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	body, err := utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&onedriveAuth{},
	)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, body)
}

// RefreshOnedriveToken generates additional access tokens after the initial
// token has expired.
func (a *App) RefreshOnedriveToken(
	w http.ResponseWriter,
	r *http.Request,
) error {
	ctx := r.Context()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	refreshToken := values.Get("refresh_token")
	if refreshToken == "" {
		return errors.New("refresh token not specified")
	}

	id := a.Config.Onedrive.AppID
	secret := a.Config.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": refreshToken,
		"redirect_uri":  strings.TrimSuffix(a.Config.RedirectURL, "/"),
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	body, err := utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&onedriveAuth{},
	)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, body)
}
