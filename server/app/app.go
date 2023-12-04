package app

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
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/ayoisaiah/stellar-photos/apperror"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/models"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/requests"
)

type App struct{}

func NewApp() App {
	return App{}
}

func trackPhotoDownload(ctx context.Context, id string) ([]byte, error) {
	conf := config.Get()

	unsplashAccessKey := conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/photos/%s/download?client_id=%s",
		conf.Unsplash.BaseURL,
		id,
		unsplashAccessKey,
	)

	var d models.UnsplashDownload

	return utils.SendGETRequest(ctx, url, &d)
}

func (a *App) GetDownloadLink(
	ctx context.Context,
	req *requests.DownloadPhoto,
) ([]byte, error) {
	return trackPhotoDownload(ctx, req.ID)
}

func (a *App) SearchPhotos(
	ctx context.Context,
	req *requests.SearchUnsplash,
) ([]byte, error) {
	conf := config.Get()

	unsplashAccessKey := conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/search/photos?page=%d&query=%s&per_page=%d&client_id=%s",
		conf.Unsplash.BaseURL,
		req.PageNumber,
		req.SearchKey,
		conf.Unsplash.DefaultPerPage,
		unsplashAccessKey,
	)

	var s models.UnsplashSearchResult

	return utils.SendGETRequest(ctx, url, &s)
}

func getBase64(
	ctx context.Context,
	req *requests.RandomPhoto,
	photo *models.UnsplashPhoto,
) (string, error) {
	imageWidth := 2000

	switch req.Resolution {
	case "high":
		highRes := 4000
		if photo.Width >= highRes {
			imageWidth = 4000
		} else {
			imageWidth = photo.Width
		}
	case "max":
		imageWidth = photo.Width
	}

	imageURL := fmt.Sprintf("%s&w=%d", photo.Urls.Raw, imageWidth)

	return utils.GetImageBase64(
		ctx,
		imageURL,
		strconv.Itoa(imageWidth),
		photo.ID,
	)
}

func (a *App) GetRandomPhoto(
	ctx context.Context,
	req *requests.RandomPhoto,
) ([]byte, error) {
	conf := config.Get()

	unsplashAccessKey := conf.Unsplash.AccessKey

	var p models.UnsplashPhoto

	var filter url.Values

	//nolint:gocritic // rewrite to switch unnecessary
	if req.Collections != "" {
		filter.Set("collections", req.Collections)
	}

	if req.Topics != "" {
		filter.Set("topics", req.Topics)
	}

	if req.Username != "" {
		filter.Set("username", req.Username)
	}

	if req.Query != "" {
		// Query cannot be used with any other filter
		filter = url.Values{}
		filter.Set("query", req.Query)
	}

	url := fmt.Sprintf(
		"%s/photos/random?%s&orientation=%s&content_filter=%s&client_id=%s",
		conf.Unsplash.BaseURL,
		filter.Encode(),
		req.Orientation,
		req.ContentFilter,
		unsplashAccessKey,
	)

	// TODO: What if an empty response is received?
	b, err := utils.GETRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(b, &p)
	if err != nil {
		return nil, err
	}

	base64, err := getBase64(ctx, req, &p)
	if err != nil {
		return nil, err
	}

	p.Base64 = base64

	return json.Marshal(p)
}

func (a *App) ValidateFilters(
	ctx context.Context,
	req *requests.ValidateFilters,
) error {
	conf := config.Get()

	unsplashAccessKey := conf.Unsplash.AccessKey

	for _, value := range req.Collections {
		url := fmt.Sprintf(
			"%s/collections/%s?client_id=%s",
			conf.Unsplash.BaseURL,
			value,
			unsplashAccessKey,
		)

		var c models.UnsplashCollection

		_, err := utils.SendGETRequest(ctx, url, &c)
		if err != nil {
			if errors.Is(err, apperror.ErrNotFound) {
				return apperror.ErrInvalidFilter.Fmt("collection", value)
			}

			return err
		}
	}

	for _, value := range req.Topics {
		url := fmt.Sprintf(
			"%s/topics/%s?client_id=%s",
			conf.Unsplash.BaseURL,
			value,
			unsplashAccessKey,
		)

		var t models.UnsplashTopic

		_, err := utils.SendGETRequest(ctx, url, &t)
		if err != nil {
			if errors.Is(err, apperror.ErrNotFound) {
				return apperror.ErrInvalidFilter.Fmt("topic", value)
			}

			return err
		}
	}

	if req.Username != "" {
		url := fmt.Sprintf(
			"%s/users/%s?client_id=%s",
			conf.Unsplash.BaseURL,
			req.Username,
			unsplashAccessKey,
		)

		var u models.UnsplashUser

		_, err := utils.SendGETRequest(ctx, url, &u)
		if err != nil {
			if errors.Is(err, apperror.ErrNotFound) {
				return apperror.ErrInvalidFilter.Fmt("username", req.Username)
			}

			return err
		}
	}

	return nil
}

func (a *App) AuthorizeGoogleDrive(
	ctx context.Context,
	req *requests.GoogleDriveAuth,
) ([]byte, error) {
	conf := config.Get()

	id := conf.GoogleDrive.Key
	secret := conf.GoogleDrive.Secret

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          req.Code,
		"redirect_uri":  conf.RedirectURL,
	}

	endpoint := "https://oauth2.googleapis.com/token"

	var g models.GoogleDriveAuth

	return utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&g,
	)
}

func (a *App) RefreshGoogleDriveToken(
	ctx context.Context,
	req *requests.RefreshGoogleDriveToken,
) ([]byte, error) {
	conf := config.Get()

	id := conf.GoogleDrive.Key
	secret := conf.GoogleDrive.Secret

	formValues := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": req.Token,
	}

	endpoint := "https://oauth2.googleapis.com/token"

	var g models.GoogleDriveAuth

	return utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&g,
	)
}

func (a *App) SaveToGoogleDrive(
	ctx context.Context,
	req *requests.SavePhotoToCloud,
) error {
	// TODO: How to set appropriate timeouts?
	const saveToDriveTimeout = 180

	_, err := trackPhotoDownload(ctx, req.ImageID)
	if err != nil {
		return err
	}

	v := fmt.Sprintf("Bearer %s", req.Token)

	ctx, cncl := context.WithTimeout(
		ctx,
		time.Second*saveToDriveTimeout,
	)
	defer cncl()

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		req.URL,
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
	metadata := fmt.Sprintf(`{"name": "photo-%s.jpeg"}`, req.ImageID)

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

	return nil
}

func (a *App) SaveToDropbox(
	ctx context.Context,
	req *requests.SavePhotoToCloud,
) error {
	_, err := trackPhotoDownload(ctx, req.ImageID)
	if err != nil {
		return err
	}

	v := fmt.Sprintf("Bearer %s", req.Token)

	requestBody, err := json.Marshal(map[string]string{
		"path": fmt.Sprintf("/photo-%s.jpg", req.ImageID),
		"url":  req.URL,
	})
	if err != nil {
		return err
	}

	endpoint := "https://api.dropboxapi.com/2/files/save_url"

	request, err := http.NewRequestWithContext(
		ctx,
		"POST",
		endpoint,
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", v)

	response, err := utils.Client.Do(request)
	if err != nil {
		return err
	}

	defer response.Body.Close()

	b, err := utils.CheckForErrors(response)
	if err != nil {
		return err
	}

	resp := &models.DropboxSaveURLResponse{}

	err = json.Unmarshal(b, resp)
	if err != nil {
		return err
	}

	if resp.Tag == "async_job_id" {
		err = checkDropboxUploadStatus(ctx, resp.AsyncJobID, req.Token)
		if err != nil {
			return err
		}

		return nil
	} else if resp.Tag == "complete" {
		return nil
	}

	return fmt.Errorf("save URL error. response from dropbox: %s", string(b))
}

func (a *App) AuthorizeOneDrive(
	ctx context.Context,
	req *requests.OneDriveAuth,
) ([]byte, error) {
	conf := config.Get()

	id := conf.Onedrive.AppID
	secret := conf.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          req.Code,
		"redirect_uri":  strings.TrimSuffix(conf.RedirectURL, "/"),
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	var o models.OnedriveAuth

	return utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&o,
	)
}

// RefreshOneDriveToken sends the request to retrieve a new OneDrive access
// token
func (a *App) RefreshOneDriveToken(
	ctx context.Context,
	req *requests.RefreshOneDriveToken,
) ([]byte, error) {
	conf := config.Get()

	id := conf.Onedrive.AppID
	secret := conf.Onedrive.Secret

	formValues := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": req.Token,
		"redirect_uri":  strings.TrimSuffix(conf.RedirectURL, "/"),
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	var o models.OnedriveAuth

	return utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		&o,
	)
}
