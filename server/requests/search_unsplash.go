package requests

import (
	"net/http"
	"strconv"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// SearchUnsplash represents a request to search for Unsplash photos.
type SearchUnsplash struct {
	SearchKey  string `json:"-"`
	PageNumber int    `json:"-"`
}

func (s *SearchUnsplash) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	s.SearchKey = values.Get("key")

	page, err := strconv.Atoi(values.Get("page"))
	if err != nil {
		return apperror.ErrInvalidSearchPage.Err(err)
	}

	s.PageNumber = page

	return s.validate()
}

func (s *SearchUnsplash) validate() error {
	if s.PageNumber <= 0 {
		return apperror.ErrInvalidSearchPage
	}

	if len(s.SearchKey) == 0 {
		return apperror.ErrEmptySearchKey
	}

	return nil
}
