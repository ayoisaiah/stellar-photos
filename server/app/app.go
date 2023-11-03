package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/models"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/requests"
)

type App struct{}

func NewApp() App {
	return App{}
}

func getDownloadURL(ctx context.Context, id string) ([]byte, error) {
	conf := config.Get()

	unsplashAccessKey := conf.Unsplash.AccessKey
	url := fmt.Sprintf(
		"%s/photos/%s/download?client_id=%s",
		conf.Unsplash.BaseURL,
		id,
		unsplashAccessKey,
	)

	var d *models.UnsplashDownload

	return utils.SendGETRequest(ctx, url, d)
}

func (a *App) GetDownloadLink(
	ctx context.Context,
	req *requests.DownloadPhoto,
) ([]byte, error) {
	return getDownloadURL(ctx, req.ID)
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

	var s *models.UnsplashSearchResult

	return utils.SendGETRequest(ctx, url, s)
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

	var p *models.UnsplashPhoto

	url := fmt.Sprintf(
		"%s/photos/random?collections=%s&client_id=%s",
		conf.Unsplash.BaseURL,
		req.Collections,
		unsplashAccessKey,
	)

	b, err := utils.GETRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(b, p)
	if err != nil {
		return nil, err
	}

	base64, err := getBase64(ctx, req, p)
	if err != nil {
		return nil, err
	}

	p.Base64 = base64

	return json.Marshal(p)
}

func (a *App) ValidateCollections(
	ctx context.Context,
	req *requests.UnsplashCollections,
) error {
	conf := config.Get()

	unsplashAccessKey := conf.Unsplash.AccessKey

	for _, value := range req.Collections {
		url := fmt.Sprintf(
			"%s/collections/%s/?client_id=%s",
			conf.Unsplash.BaseURL,
			value,
			unsplashAccessKey,
		)

		var c *models.UnsplashCollection

		_, err := utils.SendGETRequest(ctx, url, c)
		if err != nil {
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

	var g *models.GoogleDriveAuth

	return utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		g,
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

	var g *models.GoogleDriveAuth

	return utils.SendPOSTRequest(
		ctx,
		endpoint,
		formValues,
		g,
	)
}
