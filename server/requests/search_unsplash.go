package requests

import (
	"net/http"
	"strconv"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

// SearchUnsplash represents a request to search for Unsplash photos.
type SearchUnsplash struct {
	SearchKey  string `json:"-"`
	PageNumber int    `json:"-"`
}

func (s *SearchUnsplash) Init(r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	s.SearchKey = values.Get("key")
	page, err := strconv.Atoi(values.Get("page"))
	if err != nil {
		// TODO: Return a bad request
		return err
	}

	s.PageNumber = page

	return s.validate()
}

func (s *SearchUnsplash) validate() error {
	if s.PageNumber <= 0 {
		// TODO: Return error
	}

	if len(s.SearchKey) == 0 {
		// TODO: Return error
	}

	return nil
}
