package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/ayoisaiah/stellar-photos"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
	"github.com/ayoisaiah/stellar-photos/logger"
)

const stellarPhotosCollectionID = 998309

const (
	standardRes = 2000
	highRes     = 4000
)

// getCollection retrieves the Stellar Photos Unsplash collection.
func getCollection() (stellar.UnsplashCollection, error) {
	unsplashAccessKey := config.Get().Unsplash.AccessKey

	url := fmt.Sprintf(
		"%s/collections/%d?client_id=%s",
		stellar.UnsplashAPIBaseURL,
		stellarPhotosCollectionID,
		unsplashAccessKey,
	)

	var c stellar.UnsplashCollection

	_, err := utils.SendGETRequest(context.Background(), url, &c)
	if err != nil {
		return c, err
	}

	return c, nil
}

// retrieveAllPhotos fetches all the images in the default Stellar Photos
// collection.
func retrieveAllPhotos() (map[string]stellar.UnsplashPhoto, error) {
	collection, err := getCollection()
	if err != nil {
		return nil, err
	}

	unsplashAccessKey := config.Get().Unsplash.AccessKey

	allPhotos := make([]stellar.UnsplashPhoto, collection.TotalPhotos)

	page, perPage := 1, 30

	for {
		var photos []stellar.UnsplashPhoto

		url := fmt.Sprintf(
			"%s/collections/%d/photos?page=%d&per_page=%d&client_id=%s",
			stellar.UnsplashAPIBaseURL,
			stellarPhotosCollectionID,
			page,
			perPage,
			unsplashAccessKey,
		)

		_, err := utils.SendGETRequest(context.Background(), url, &photos)
		if err != nil {
			return nil, err
		}

		if len(photos) == 0 {
			break
		}

		allPhotos = append(allPhotos, photos...)

		page++
	}

	m := make(map[string]stellar.UnsplashPhoto)

	for i := range allPhotos {
		v := allPhotos[i]

		m[v.ID] = v
	}

	delete(m, "")

	return m, nil
}

// downloadPhotos caches various resolutions of the Unsplash images in a local
// directory.
func downloadPhotos(
	photos map[string]stellar.UnsplashPhoto,
) map[string]error {
	errs := make(map[string]error)

	for k := range photos {
		v := photos[k]

		err := os.MkdirAll(filepath.Join("cached_images", k), os.ModePerm)
		if err != nil {
			errs[k] = err
			continue
		}

		widths := []int{standardRes}

		if v.Width >= highRes {
			widths = append(widths, highRes, v.Width)
		} else {
			widths = append(widths, v.Width)
		}

		for _, width := range widths {
			imageURL := fmt.Sprintf("%s&w=%d", v.Urls.Raw, width)

			fileName := fmt.Sprintf("%d.txt", width)

			filePath := filepath.Join("cached_images", k, fileName)

			if _, err = os.Stat(filePath); err == nil ||
				errors.Is(err, os.ErrExist) {
				continue
			}

			var base64 string

			ctx := context.WithValue(
				context.Background(),
				utils.ContextKeyRequestID,
				"cache",
			)

			base64, err = utils.GetImageBase64(ctx, imageURL, fileName, k)
			if err != nil {
				errs[k] = err
				continue
			}

			err = os.WriteFile(filePath, []byte(base64), os.ModePerm)
			if err != nil {
				errs[k] = err
				continue
			}
		}

		fileName := k + ".json"

		filePath := filepath.Join("cached_images", k, fileName)

		if _, err = os.Stat(filePath); err == nil ||
			errors.Is(err, os.ErrExist) {
			continue
		}

		b, err := json.Marshal(v)
		if err != nil {
			errs[k] = err
			continue
		}

		err = os.WriteFile(filePath, b, os.ModePerm)
		if err != nil {
			errs[k] = err
			continue
		}
	}

	return errs
}

// cleanup deletes any locally cached image that is no longer present
// in the default collection.
func cleanup(photos map[string]stellar.UnsplashPhoto) {
	l := logger.L()

	files, err := os.ReadDir("cached_images")
	if err != nil {
		l.Warnw("unable to locate cache directory",
			"error", err,
		)

		return
	}

	cleaned := make(map[string]bool)

	for _, f := range files {
		id := f.Name()

		if _, ok := cleaned[id]; ok {
			continue
		}

		if _, ok := photos[id]; !ok {
			err := os.RemoveAll(filepath.Join("cached_images", id))
			if err != nil {
				l.Warnw(
					"unable to delete photo from image cache",
					"image_id",
					id,
					"error",
					err,
				)

				continue
			}

			cleaned[id] = true

			l.Infow("deleted image from cache successfully",
				"image_id", id,
			)
		}
	}
}

// Photos caches all Unsplash images in the default collection locally.
// to speed up delivery. It also cleans up images that were deleted from
// the default collection.
func Photos() {
	conf := config.Get()

	if conf.GoEnv != "production" {
		return
	}

	l := logger.L()

	l.Infow("pre-caching all images in default collection")

	photos, err := retrieveAllPhotos()
	if err != nil {
		l.Errorw("unable to retrieve all images in default collection",
			"error", err,
		)

		return
	}

	errs := downloadPhotos(photos)
	if len(errs) != 0 {
		l.Warnw("some cache image downloads failed to complete",
			"errors", errs,
		)

		return
	}

	cleanup(photos)

	l.Infow("default images cached successfully!")
}
