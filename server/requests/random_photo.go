package requests

import (
	"net/http"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

type RandomPhoto struct {
	Collections string `json:"-"`
	Resolution  string `json:"-"`
	// TODO: Add ability to filter by topic, user, query, orientation, etc
}

func (p *RandomPhoto) Init(r *http.Request) error {
	conf := config.Get()

	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := values.Get("collections")
	if collections == "" {
		collections = conf.Unsplash.DefaultCollection
	}

	resolution := values.Get("resolution")
	if resolution == "" {
		resolution = conf.Unsplash.DefaultResolution
	}

	return nil
}
