package app

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/go-resty/resty/v2"

	"github.com/ayoisaiah/stellar-photos/internal/models"
	"github.com/ayoisaiah/stellar-photos/metrics"
	"github.com/ayoisaiah/stellar-photos/requests"
)

// getBase64 retrieves the base64 representation of an Unsplash image.
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

	return getImageBase64(
		ctx,
		imageURL,
		strconv.Itoa(imageWidth),
		photo.ID,
	)
}

// getImageBase64 implements read-through caching in which the image's
// base64 string is retrieved from the cache first or the network if
// not found in the cache.
func getImageBase64(
	ctx context.Context,
	endpoint, imageWidth, id string,
) (string, error) {
	filePath := filepath.Join("cached_images", id, imageWidth) + ".txt"

	var base64Str string

	if _, err := os.Stat(filePath); err == nil || errors.Is(err, os.ErrExist) {
		b, err := os.ReadFile(filePath)
		if err == nil {
			base64Str = string(b)

			metrics.M.CacheOrNetwork.WithLabelValues("cache").Inc()

			slog.DebugContext(
				ctx,
				"successfully retrieved cached unsplash image",
				slog.String("image_id", id),
				slog.String("image_width", imageWidth),
				slog.Bool("cache", true),
			)

			return base64Str, nil
		}

		slog.WarnContext(ctx, "failed to read cached image file",
			slog.String("path", filePath),
			slog.Any("error", err),
		)
	}

	var err error

	base64Str, err = imageURLToBase64(ctx, endpoint)
	if err != nil {
		return base64Str, fmt.Errorf(
			"unable to base64 encode image at url '%s': %w",
			endpoint,
			err,
		)
	}

	slog.DebugContext(
		ctx,
		"successfully retrieved unsplash image from the network",
		slog.String("image_id", id),
		slog.String("image_width", imageWidth),
	)

	return base64Str, nil
}

// imageURLToBase64 retrives the Base64 representation of an image URL and
// returns it.
func imageURLToBase64(ctx context.Context, endpoint string) (string, error) {
	// TODO: Set a timeout
	var base64Encoding string

	client := resty.New()
	resp, err := client.R().
		SetContext(ctx).
		Get(endpoint)
	if err != nil {
		return "", err
	}

	mimeType := http.DetectContentType(resp.Body())

	switch mimeType {
	case "image/jpeg":
		base64Encoding += "data:image/jpeg;base64,"
	case "image/png":
		base64Encoding += "data:image/png;base64,"
	default:
		return "", fmt.Errorf(
			"only image/jpeg and image/png mime types are supported, got %s",
			mimeType,
		)
	}

	base64Encoding += base64.StdEncoding.EncodeToString(resp.Body())

	return base64Encoding, nil
}
