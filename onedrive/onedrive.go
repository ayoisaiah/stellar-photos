package onedrive

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// Onedrive Application ID
type onedriveID struct {
	ID string `json:"id"`
}

// onedriveAuth represents the request body after a successful authentication
type onedriveAuth struct {
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// SendOnedriveID sends the application id to the client on request
func SendOnedriveID(w http.ResponseWriter, r *http.Request) error {
	id := config.Conf.Onedrive.AppID

	d := onedriveID{
		ID: id,
	}

	bytes, err := json.Marshal(d)
	if err != nil {
		return err
	}

	return utils.JSONResponse(w, bytes)
}

// AuthorizeOnedrive redeems the authorization code received from the client for
// an access token
func AuthorizeOnedrive(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	code := values.Get("code")
	if code == "" {
		return errors.New("Authorization code not specified")
	}

	id := config.Conf.Onedrive.AppID
	secret := config.Conf.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          code,
		"redirect_uri":  config.Conf.RedirectURL,
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"
	body, err := utils.SendPOSTRequest(endpoint, formValues, &onedriveAuth{})
	if err != nil {
		return err
	}

	return utils.JSONResponse(w, body)
}

// RefreshOnedriveToken generates additional access tokens after the initial
// token has expired
func RefreshOnedriveToken(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	refreshToken := values.Get("refresh_token")
	if refreshToken == "" {
		return errors.New("Refresh token not specified")
	}

	id := config.Conf.Onedrive.AppID
	secret := config.Conf.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": refreshToken,
		"redirect_uri":  config.Conf.RedirectURL,
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"
	body, err := utils.SendPOSTRequest(endpoint, formValues, &onedriveAuth{})
	if err != nil {
		return err
	}

	return utils.JSONResponse(w, body)
}
