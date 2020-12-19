package googledrive

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// Dropbox application key
type key struct {
	GoogleDriveKey string `json:"googledrive_key"`
}

// SendGoogleDriveKey sends the application key to the client on request to avoid
// exposing it in the extension code
func SendGoogleDriveKey(w http.ResponseWriter, r *http.Request) {
	d := key{
		GoogleDriveKey: config.Conf.GoogleDrive.Key,
	}

	bytes, err := json.Marshal(d)
	if err != nil {
		utils.InternalServerError(w, err.Error())
	}

	utils.JsonResponse(w, bytes)
}

// AuthorizeGoogleDrive redeems the authorization code received from the client for
// an access token
func AuthorizeGoogleDrive(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		utils.InternalServerError(w, "Failed to parse URL")
		return
	}

	code := values.Get("code")

	id := config.Conf.GoogleDrive.Key
	secret := config.Conf.GoogleDrive.Secret

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          code,
		"redirect_uri":  "https://ayoisaiah.github.io/stellar-photos",
	}

	endpoint := "https://oauth2.googleapis.com/token"
	body, err := utils.SendPOSTRequest(endpoint, formValues)
	if err != nil {
		fmt.Println(err)
		utils.InternalServerError(w, "Failed to retrieve Google Drive credentials")
		return
	}

	utils.JsonResponse(w, body)
}

// RefreshGoogleDriveToken generates additional access tokens after the initial
// token has expired
func RefreshGoogleDriveToken(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		utils.InternalServerError(w, "Failed to parse URL")
		return
	}

	refreshToken := values.Get("refresh_token")

	id := config.Conf.GoogleDrive.Key
	secret := config.Conf.GoogleDrive.Secret

	formValues := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": refreshToken,
	}

	endpoint := "https://oauth2.googleapis.com/token"
	body, err := utils.SendPOSTRequest(endpoint, formValues)
	if err != nil {
		utils.InternalServerError(w, "Failed to retrieve Google Drive credentials")
		return
	}

	utils.JsonResponse(w, body)
}

// SaveToGoogleDrive saves the requested photo to the current user's
// Google Drive account
func SaveToGoogleDrive(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		utils.InternalServerError(w, "Failed to parse URL")
		return
	}

	token := values.Get("token")
	id := values.Get("id")
	url := values.Get("url")

	err = unsplash.TrackPhotoDownload(id)
	if err != nil {
		utils.SendError(w, err)
		return
	}

	v := fmt.Sprintf("Bearer %s", token)

	client := &http.Client{}
	resp, err := http.Get(url)
	if err != nil {
		utils.SendError(w, err)
		return
	}

	defer resp.Body.Close()

	fmt.Println("1: Here")
	imageBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		utils.SendError(w, err)
		return
	}

	fmt.Println(len(imageBytes))
	endpoint := "https://www.googleapis.com/upload/drive/v3/files?uploadType=media"

	request, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(imageBytes))
	if err != nil {
		utils.InternalServerError(w, "Failed to construct request")
		return
	}

	request.Header.Set("Content-Length", fmt.Sprintf("%d", len(imageBytes)))
	request.Header.Set("Content-Type", "image/jpeg")
	request.Header.Set("Authorization", v)

	response, err := client.Do(request)
	if err != nil {
		utils.InternalServerError(w, "Network connectivity error")
		return
	}

	defer response.Body.Close()

	_, err = utils.CheckForErrors(response)
	if err != nil {
		utils.SendError(w, err)
		return
	}
}
