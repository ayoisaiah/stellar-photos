package utils

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime/debug"
	"time"

	"go.uber.org/zap"

	"github.com/ayoisaiah/stellar-photos/logger"
)

type contextKey string

const (
	defaultTimeoutInSeconds            = 60
	ContextKeyRequestID     contextKey = "requestID"
)

// GetImageBase64 implements read-through caching in which the image's
// base64 string is retrieved from the cache first or the network if
// not found in the cache.
func GetImageBase64(
	ctx context.Context,
	endpoint, filename, id string,
) (string, error) {
	l := logger.FromCtx(ctx)

	filePath := filepath.Join("cached_images", id, filename) + ".txt"

	var base64Str string

	if _, err := os.Stat(filePath); err == nil || errors.Is(err, os.ErrExist) {
		b, err := os.ReadFile(filePath)
		if err == nil {
			base64Str = string(b)

			l.Info("retrieved unsplash image from the cache",
				zap.String("image_id", id),
				zap.String("file_name", filename),
			)

			return base64Str, nil
		}

		l.Warn("unable to read cached image file",
			zap.String("path", filePath),
			zap.Error(err),
		)
	}

	var err error

	base64Str, err = imageURLToBase64(endpoint)
	if err != nil {
		return base64Str, fmt.Errorf(
			"unable to encode image at url '%s' as base64: %w",
			endpoint,
			err,
		)
	}

	l.Info("retrieved unsplash image from the network",
		zap.String("image_id", id),
		zap.String("file_name", filename),
	)

	return base64Str, nil
}

// imageURLToBase64 retrives the Base64 representation of an image URL and
// returns it.
func imageURLToBase64(endpoint string) (string, error) {
	ctx, cancel := context.WithTimeout(
		context.Background(),
		time.Second*defaultTimeoutInSeconds,
	)

	defer cancel()

	var base64Encoding string

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		endpoint,
		http.NoBody,
	)
	if err != nil {
		return base64Encoding, err
	}

	resp, err := Client.Do(request)
	if err != nil {
		return base64Encoding, err
	}

	defer resp.Body.Close()

	bytes, err := CheckForErrors(resp)
	if err != nil {
		return base64Encoding, err
	}

	mimeType := http.DetectContentType(bytes)

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

	base64Encoding += base64.StdEncoding.EncodeToString(bytes)

	return base64Encoding, nil
}

func GetGitRevision() string {
	var gitRevision string

	buildInfo, ok := debug.ReadBuildInfo()
	if ok {
		for _, v := range buildInfo.Settings {
			if v.Key == "vcs.revision" {
				gitRevision = v.Value
				break
			}
		}
	}

	return gitRevision
}
