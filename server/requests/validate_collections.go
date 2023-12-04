package requests

import (
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/apperror"
)

// ValidateFilters represents a request to validate the provided collection
// IDs, topics, and username
type ValidateFilters struct {
	Collections []string `json:"-"`
	Topics      []string `json:"-"`
	Username    string   `json:"-"`
}

func (v *ValidateFilters) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := strings.TrimSpace(values.Get("collections"))
	if collections != "" {
		v.Collections = strings.Split(collections, ",")
	}

	topics := strings.TrimSpace(values.Get("topics"))
	if topics != "" {
		v.Topics = strings.Split(topics, ",")
	}

	v.Username = strings.TrimSpace(values.Get("username"))

	return v.validate()
}

func (v *ValidateFilters) validate() error {
	if len(v.Collections) == 0 && len(v.Topics) == 0 && v.Username == "" {
		return apperror.ErrValidateNothing
	}

	return nil
}
