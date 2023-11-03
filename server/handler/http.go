package handler

import (
	"net/http"

	"github.com/ayoisaiah/stellar-photos/app"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/requests"
)

type Handler struct {
	app app.App
}

func NewHandler(application app.App) Handler {
	return Handler{
		app: application,
	}
}

// DownloadPhoto handles GET /unsplash/download
// It increments the number of downloads for the specified photo.
func (h *Handler) DownloadPhoto(
	w http.ResponseWriter,
	r *http.Request,
) error {
	var p requests.DownloadPhoto

	err := p.Init(r)
	if err != nil {
		return err
	}

	ctx := r.Context()

	resp, err := h.app.GetDownloadLink(ctx, &p)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, resp)
}

// SearchUnsplash handles GET /unsplash/search
// It retrieves a single page of photo results for a query.
func (h *Handler) SearchPhotos(w http.ResponseWriter, r *http.Request) error {
	var p requests.SearchUnsplash

	err := p.Init(r)
	if err != nil {
		return err
	}

	ctx := r.Context()

	resp, err := h.app.SearchPhotos(ctx, &p)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, resp)
}

// GetRandomPhoto handles GET /unsplash/random
// It retrives a random image from unsplash and responds with its Base64
// representation.
func (h *Handler) GetRandomPhoto(w http.ResponseWriter, r *http.Request) error {
	var p requests.RandomPhoto

	err := p.Init(r)
	if err != nil {
		return err
	}

	ctx := r.Context()

	resp, err := h.app.GetRandomPhoto(ctx, &p)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, resp)
}

func (h *Handler) ValidateCollections(
	w http.ResponseWriter,
	r *http.Request,
) error {
	var p requests.UnsplashCollections

	err := p.Init(r)
	if err != nil {
		return err
	}

	ctx := r.Context()

	err = h.app.ValidateCollections(ctx, &p)
	if err != nil {
		return err
	}

	w.WriteHeader(http.StatusOK)

	return nil
}

// SendGoogleDriveKey handles /gdrive/key
// It sends the application key to the client on request to avoid exposing it in
// the extension code.
func (h *Handler) SendGoogleDriveKey(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	key := config.Get().GoogleDrive.Key

	b := []byte("{\"google_drive_key\":" + key + "}")

	return utils.JSONResponse(ctx, w, b)
}

// AuthorizeGoogleDrive handles GET /gdrive/code
// It redeems the authorization code received from the client for an access token.
func (h *Handler) AuthorizeGoogleDrive(
	w http.ResponseWriter,
	r *http.Request,
) error {
	var p requests.GoogleDriveAuth

	err := p.Init(r)
	if err != nil {
		return err
	}

	ctx := r.Context()

	resp, err := h.app.AuthorizeGoogleDrive(ctx, &p)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, resp)
}

// RefreshGoogleDriveToken handles /gdrive/refresh
// It generates additional access tokens after the initial token has expired.
func (h *Handler) RefreshGoogleDriveToken(
	w http.ResponseWriter,
	r *http.Request,
) error {
	var p requests.RefreshGoogleDriveToken

	err := p.Init(r)
	if err != nil {
		return err
	}

	ctx := r.Context()

	resp, err := h.app.RefreshGoogleDriveToken(ctx, &p)
	if err != nil {
		return err
	}

	return utils.JSONResponse(ctx, w, resp)
}

// SaveToGoogleDrive handles /gdrive/save
// It saves the requested photo to the current user's Google Drive account.
func (h *Handler) SaveToGoogleDrive(w http.ResponseWriter, r *http.Request) error {
	var p requests.SavePhotoToDrive

	err := p.Init(r)
	if err != nil {
		return err
	}

	ctx := r.Context()

	err = h.app.SaveToGoogleDrive(ctx, &p)
	if err != nil {
		return err
	}

	w.WriteHeader(http.StatusOK)

	return nil
}
