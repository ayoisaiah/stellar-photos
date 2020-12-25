package googledrive

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"time"

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
func SendGoogleDriveKey(w http.ResponseWriter, r *http.Request) error {
	d := key{
		GoogleDriveKey: config.Conf.GoogleDrive.Key,
	}

	bytes, err := json.Marshal(d)
	if err != nil {
		return err
	}

	return utils.JsonResponse(w, bytes)
}

// AuthorizeGoogleDrive redeems the authorization code received from the client for
// an access token
func AuthorizeGoogleDrive(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
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
		return err
	}

	return utils.JsonResponse(w, body)
}

// RefreshGoogleDriveToken generates additional access tokens after the initial
// token has expired
func RefreshGoogleDriveToken(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
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
		return err
	}

	return utils.JsonResponse(w, body)
}

// SaveToGoogleDrive saves the requested photo to the current user's
// Google Drive account
func SaveToGoogleDrive(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	token := values.Get("token")
	id := values.Get("id")
	url := values.Get("url")

	err = unsplash.TrackPhotoDownload(id)
	if err != nil {
		return err
	}

	v := fmt.Sprintf("Bearer %s", token)

	client := &http.Client{Timeout: 180 * time.Second}
	resp, err := http.Get(url)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	respBody, err := utils.CheckForErrors(resp)
	if err != nil {
		return err
	}

	endpoint := "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"

	// Metadata content.
	// New multipart writer.
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Metadata part.
	metadata := fmt.Sprintf(`{"name": "photo-%s.jpeg"}`, id)
	metadataHeader := textproto.MIMEHeader{}
	metadataHeader.Set("Content-Type", "application/json; charset=UTF-8")
	part, _ := writer.CreatePart(metadataHeader)
	part.Write([]byte(metadata))

	mediaHeader := textproto.MIMEHeader{}
	mediaHeader.Set("Content-Type", "image/jpeg")

	mediaPart, _ := writer.CreatePart(mediaHeader)
	io.Copy(mediaPart, bytes.NewReader(respBody))

	// Close multipart writer.
	writer.Close()

	request, err := http.NewRequest("POST", endpoint, bytes.NewReader(body.Bytes()))
	if err != nil {
		return err
	}

	request.Header.Set("Content-Length", fmt.Sprintf("%d", body.Len()))
	contentType := fmt.Sprintf("multipart/related; boundary=%s", writer.Boundary())
	request.Header.Set("Content-Type", contentType)
	request.Header.Set("Authorization", v)

	response, err := client.Do(request)
	if err != nil {
		return err
	}

	defer response.Body.Close()

	_, err = utils.CheckForErrors(response)
	if err != nil {
		return err
	}

	w.WriteHeader(http.StatusOK)
	return nil
}
