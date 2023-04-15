package stellar

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"time"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

const (
	saveToDriveTimeout = 180
)

// Google drive application key.
type googleDrive struct {
	Key string `json:"googledrive_key"`
}

type googleDriveAuth struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

// SendGoogleDriveKey sends the application key to the client on request to avoid
// exposing it in the extension code.
func SendGoogleDriveKey(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	d := googleDrive{
		Key: config.Get().GoogleDrive.Key,
	}

	b, err := json.Marshal(d)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, b)
}

// AuthorizeGoogleDrive redeems the authorization code received from the client for
// an access token.
func AuthorizeGoogleDrive(
	w http.ResponseWriter,
	r *http.Request,
) error {
	conf := config.Get()

	ctx := r.Context()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	code := values.Get("code")

	id := conf.GoogleDrive.Key
	secret := conf.GoogleDrive.Secret

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          code,
		"redirect_uri":  conf.RedirectURL,
	}

	endpoint := "https://oauth2.googleapis.com/token"

	body, err := utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&googleDriveAuth{},
	)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, body)
}

// RefreshGoogleDriveToken generates additional access tokens after the initial
// token has expired.
func RefreshGoogleDriveToken(
	w http.ResponseWriter,
	r *http.Request,
) error {
	conf := config.Get()

	ctx := r.Context()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	refreshToken := values.Get("refresh_token")
	if refreshToken == "" {
		return errors.New("refresh token not specified")
	}

	id := conf.GoogleDrive.Key
	secret := conf.GoogleDrive.Secret

	formValues := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": refreshToken,
	}

	endpoint := "https://oauth2.googleapis.com/token"

	body, err := utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&googleDriveAuth{},
	)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, body)
}

// SaveToGoogleDrive saves the requested photo to the current user's
// Google Drive account.
func SaveToGoogleDrive(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	token := values.Get("token")
	id := values.Get("id")
	url := values.Get("url")

	ctx = context.WithValue(ctx, DownloadCtxKey, "save_to_googledrive")

	_, err = TrackPhotoDownload(ctx, id)
	if err != nil {
		return err
	}

	v := fmt.Sprintf("Bearer %s", token)

	ctx, cncl := context.WithTimeout(
		ctx,
		time.Second*saveToDriveTimeout,
	)
	defer cncl()

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		url,
		http.NoBody,
	)
	if err != nil {
		return err
	}

	resp, err := utils.Client.Do(request)
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

	_, err = part.Write([]byte(metadata))
	if err != nil {
		return err
	}

	mediaHeader := textproto.MIMEHeader{}
	mediaHeader.Set("Content-Type", "image/jpeg")

	mediaPart, _ := writer.CreatePart(mediaHeader)

	_, err = io.Copy(mediaPart, bytes.NewReader(respBody))
	if err != nil {
		return err
	}

	// Close multipart writer.
	writer.Close()

	request, err = http.NewRequest(
		"POST",
		endpoint,
		bytes.NewReader(body.Bytes()),
	)
	if err != nil {
		return err
	}

	contentType := fmt.Sprintf(
		"multipart/related; boundary=%s",
		writer.Boundary(),
	)

	request.Header.Set("Content-Type", contentType)
	request.Header.Set("Authorization", v)
	request.Header.Set("Content-Length", fmt.Sprintf("%d", body.Len()))

	response, err := utils.Client.Do(request)
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
