package onedrive

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// SendOnedriveID sends the application id to the client on request to avoid
// exposing it in the extension code
func SendOnedriveID(w http.ResponseWriter, r *http.Request) {
	id := config.Conf.Onedrive.AppID

	d := onedriveID{
		ID: id,
	}

	utils.SendJSON(w, d)
}

// AuthorizeOnedrive redeems the authorization code received from the client for
// an access token
func AuthorizeOnedrive(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		utils.InternalServerError(w, "Failed to parse URL")
		return
	}

	code := values.Get("code")

	id := config.Conf.Onedrive.AppID
	secret := config.Conf.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          code,
		"redirect_uri":  "https://ayoisaiah.github.io/stellar-photos",
	}

	onedriveToken(w, r, formValues)
}

// RefreshOnedriveToken generates additional access tokens after the initial
// token has expired
func RefreshOnedriveToken(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		utils.InternalServerError(w, "Failed to parse URL")
		return
	}

	refreshToken := values.Get("refresh_token")

	id := config.Conf.Onedrive.AppID
	secret := config.Conf.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": refreshToken,
		"redirect_uri":  "https://ayoisaiah.github.io/stellar-photos",
	}

	onedriveToken(w, r, formValues)
}

func onedriveToken(w http.ResponseWriter, r *http.Request, formValues map[string]string) {
	form := url.Values{}
	for key, value := range formValues {
		form.Add(key, value)
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	request, err := http.NewRequest("POST", endpoint, strings.NewReader(form.Encode()))

	if err != nil {
		utils.InternalServerError(w, "Failed to construct request")
		return
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	response, err := client.Do(request)

	if err != nil {
		utils.InternalServerError(w, "Network connectivity error")
		return
	}

	defer response.Body.Close()

	auth := &onedriveAuth{}

	err = json.NewDecoder(response.Body).Decode(auth)

	if err != nil {
		utils.InternalServerError(w, "Failed to decode response body as JSON")
		return
	}

	err = utils.CheckForErrors(response)
	if err != nil {
		utils.SendError(w, err)
		return
	}

	utils.SendJSON(w, auth)
}
