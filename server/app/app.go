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
	"github.com/ayoisaiah/stellar-photos/internal/fetch"
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

	endpoint := fmt.Sprintf(
		"%s/photos/%s/download?client_id=%s",
		conf.Unsplash.BaseURL,
		id,
		unsplashAccessKey,
	)

	var d models.UnsplashDownload

	return fetch.HTTPGet(ctx, endpoint, &d)
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
	endpoint := fmt.Sprintf(
		"%s/search/photos?page=%d&query=%s&per_page=%d&client_id=%s",
		conf.Unsplash.BaseURL,
		req.PageNumber,
		req.SearchKey,
		conf.Unsplash.DefaultPerPage,
		unsplashAccessKey,
	)

	var s models.UnsplashSearchResult

	return fetch.HTTPGet(ctx, endpoint, &s)
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

	filter := make(url.Values)

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

	endpoint := fmt.Sprintf(
		"%s/photos/random?%s&orientation=%s&content_filter=%s&client_id=%s",
		conf.Unsplash.BaseURL,
		filter.Encode(),
		req.Orientation,
		req.ContentFilter,
		unsplashAccessKey,
	)

	// TODO: What if an empty response is received?
	b, err := utils.GETRequest(ctx, endpoint)
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
		endpoint := fmt.Sprintf(
			"%s/collections/%s?client_id=%s",
			conf.Unsplash.BaseURL,
			value,
			unsplashAccessKey,
		)

		var c models.UnsplashCollection

		_, err := fetch.HTTPGet(ctx, endpoint, &c)
		if err != nil {
			if errors.Is(err, apperror.ErrNotFound) {
				return apperror.ErrInvalidFilter.Fmt("collection", value)
			}

			return err
		}
	}

	for _, value := range req.Topics {
		endpoint := fmt.Sprintf(
			"%s/topics/%s?client_id=%s",
			conf.Unsplash.BaseURL,
			value,
			unsplashAccessKey,
		)

		var t models.UnsplashTopic

		_, err := fetch.HTTPGet(ctx, endpoint, &t)
		if err != nil {
			if errors.Is(err, apperror.ErrNotFound) {
				return apperror.ErrInvalidFilter.Fmt("topic", value)
			}

			return err
		}
	}

	if req.Username != "" {
		endpoint := fmt.Sprintf(
			"%s/users/%s?client_id=%s",
			conf.Unsplash.BaseURL,
			req.Username,
			unsplashAccessKey,
		)

		var u models.UnsplashUser

		_, err := fetch.HTTPGet(ctx, endpoint, &u)
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
	req *requests.CloudAuth,
) ([]byte, error) {
	conf := config.Get()

	id := conf.GoogleDrive.Key
	secret := conf.GoogleDrive.Secret

	form := url.Values{}
	form.Add("grant_type", "authorization_code")
	form.Add("client_id", id)
	form.Add("client_secret", secret)
	form.Add("code", req.Code)
	form.Add("redirect_uri", strings.TrimSuffix(conf.RedirectURL, "/"))

	reqBody := strings.NewReader(form.Encode())

	reqHeaders := map[string]string{
		"Content-Type": "application/x-www-form-urlencoded",
	}

	endpoint := "https://oauth2.googleapis.com/token"

	var g models.GoogleDriveAuth

	return fetch.HTTPPost(
		ctx,
		endpoint,
		reqHeaders,
		reqBody,
		&g,
	)
}

func (a *App) RefreshGoogleDriveToken(
	ctx context.Context,
	req *requests.RefreshToken,
) ([]byte, error) {
	conf := config.Get()

	id := conf.GoogleDrive.Key
	secret := conf.GoogleDrive.Secret

	form := url.Values{}
	form.Add("grant_type", "refresh_token")
	form.Add("client_id", id)
	form.Add("client_secret", secret)
	form.Add("refresh_token", req.Token)

	reqBody := strings.NewReader(form.Encode())

	reqHeaders := map[string]string{
		"Content-Type": "application/x-www-form-urlencoded",
	}

	endpoint := "https://oauth2.googleapis.com/token"

	var g models.GoogleDriveAuth

	return fetch.HTTPPost(
		ctx,
		endpoint,
		reqHeaders,
		reqBody,
		&g,
	)
}

func (a *App) SaveToGoogleDrive(
	ctx context.Context,
	req *requests.SavePhotoToCloud,
) error {
	_, err := trackPhotoDownload(ctx, req.ImageID)
	if err != nil {
		return err
	}

	respBody, err := fetch.HTTPGet[any](ctx, req.URL, nil)
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

	contentType := fmt.Sprintf(
		"multipart/related; boundary=%s",
		writer.Boundary(),
	)

	bearerToken := fmt.Sprintf("Bearer %s", req.Token)

	reqHeaders := map[string]string{
		"Content-Type":   contentType,
		"Authorization":  bearerToken,
		"Content-Length": strconv.Itoa(body.Len()),
	}

	_, err = fetch.HTTPPost[any](
		ctx,
		endpoint,
		reqHeaders,
		bytes.NewReader(body.Bytes()),
		nil,
	)

	return err
}

func (a *App) SaveToDropbox(
	ctx context.Context,
	req *requests.SavePhotoToCloud,
) error {
	_, err := trackPhotoDownload(ctx, req.ImageID)
	if err != nil {
		return err
	}

	reqBody, err := json.Marshal(map[string]string{
		"path": fmt.Sprintf("/photo-%s.jpg", req.ImageID),
		"url":  req.URL,
	})
	if err != nil {
		return err
	}

	bearerToken := fmt.Sprintf("Bearer %s", req.Token)

	reqHeaders := map[string]string{
		"Authorization": bearerToken,
		"Content-Type":  "application/json",
	}

	endpoint := "https://api.dropboxapi.com/2/files/save_url"

	var uploadStatus models.DropboxUploadStatus

	b, err := fetch.HTTPPost(
		ctx,
		endpoint,
		reqHeaders,
		bytes.NewBuffer(reqBody),
		&uploadStatus,
	)
	if err != nil {
		return err
	}

	if uploadStatus.Tag == "async_job_id" {
		return checkDropboxUploadStatus(ctx, uploadStatus.AsyncJobID, req.Token)
	}

	if uploadStatus.Tag == "complete" {
		return nil
	}

	return apperror.ErrSaveToCloudFailed.Err(errors.New(string(b)))
}

func checkDropboxUploadStatus(ctx context.Context, jobID, token string) error {
	for {
		bearerToken := fmt.Sprintf("Bearer %s", token)

		reqBody, err := json.Marshal(map[string]string{
			"async_job_id": jobID,
		})
		if err != nil {
			return err
		}

		endpoint := "https://api.dropboxapi.com/2/files/save_url/check_job_status"

		reqHeaders := map[string]string{
			"Authorization": bearerToken,
			"Content-Type":  "application/json",
		}

		var uploadStatus models.DropboxUploadStatus

		b, err := fetch.HTTPPost(
			ctx,
			endpoint,
			reqHeaders,
			bytes.NewBuffer(reqBody),
			&uploadStatus,
		)
		if err != nil {
			return err
		}

		if uploadStatus.Tag == "complete" {
			return nil
		}

		if uploadStatus.Tag == "in_progress" {
			time.Sleep(1 * time.Second)
			continue
		}

		return apperror.ErrSaveToCloudFailed.Err(errors.New(string(b)))
	}
}

func (a *App) AuthorizeOneDrive(
	ctx context.Context,
	req *requests.CloudAuth,
) ([]byte, error) {
	conf := config.Get()

	id := conf.Onedrive.AppID
	secret := conf.Onedrive.Secret

	form := url.Values{}
	form.Add("grant_type", "authorization_code")
	form.Add("client_id", id)
	form.Add("client_secret", secret)
	form.Add("code", req.Code)
	form.Add("redirect_uri", strings.TrimSuffix(conf.RedirectURL, "/"))

	reqBody := strings.NewReader(form.Encode())

	reqHeaders := map[string]string{
		"Content-Type": "application/x-www-form-urlencoded",
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	var o models.OnedriveAuth

	return fetch.HTTPPost(
		ctx,
		endpoint,
		reqHeaders,
		reqBody,
		&o,
	)
}

// RefreshOneDriveToken sends the request to retrieve a new OneDrive access
// token.
func (a *App) RefreshOneDriveToken(
	ctx context.Context,
	req *requests.RefreshToken,
) ([]byte, error) {
	conf := config.Get()

	id := conf.Onedrive.AppID
	secret := conf.Onedrive.Secret

	form := url.Values{}
	form.Add("grant_type", "refresh_token")
	form.Add("client_id", id)
	form.Add("client_secret", secret)
	form.Add("refresh_token", req.Token)
	form.Add("redirect_uri", strings.TrimSuffix(conf.RedirectURL, "/"))

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	reqBody := strings.NewReader(form.Encode())

	reqHeaders := map[string]string{
		"Content-Type": "application/x-www-form-urlencoded",
	}

	var o models.OnedriveAuth

	return fetch.HTTPPost(
		ctx,
		endpoint,
		reqHeaders,
		reqBody,
		&o,
	)
}

func (a *App) SaveToOneDrive(
	ctx context.Context,
	req *requests.SavePhotoToCloud,
) error {
	_, err := trackPhotoDownload(ctx, req.ImageID)
	if err != nil {
		return err
	}

	bearerToken := fmt.Sprintf("Bearer %s", req.Token)

	requestBody, err := json.Marshal(map[string]string{
		"name":                       fmt.Sprintf("/photo-%s.jpg", req.ImageID),
		"@microsoft.graph.sourceUrl": req.URL,
	})
	if err != nil {
		return err
	}

	endpoint := "https://graph.microsoft.com/v1.0/drive/special/approot/children"

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
	request.Header.Set("Authorization", bearerToken)
	request.Header.Set("Prefer", "response-async")

	response, err := utils.Client.Do(request)
	if err != nil {
		return err
	}

	defer response.Body.Close()

	_, err = utils.CheckForErrors(response)
	if err != nil {
		return err
	}

	location := response.Header.Get("location")
	if location != "" {
		return checkOneDriveUploadStatus(ctx, location)
	}

	return apperror.ErrSaveToCloudFailed
}

func checkOneDriveUploadStatus(ctx context.Context, endpoint string) error {
	for {
		var uploadStatus models.OneDriveUploadStatus

		_, err := fetch.HTTPGet(ctx, endpoint, &uploadStatus)
		if err != nil {
			return err
		}

		if uploadStatus.Status == "completed" {
			return nil
		}

		time.Sleep(1 * time.Second)
	}

	return apperror.ErrSaveToCloudFailed
}
