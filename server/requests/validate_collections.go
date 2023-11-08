package requests

import (
	"net/http"
	"strings"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

// ValidateFilters represents a request to validate the provided collection
// IDs.
type ValidateFilters struct {
	Collections []string `json:"-"`
	Topics      []string `json:"-"`
}

func (v *ValidateFilters) Init(r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := strings.Split(values.Get("collections"), ",")
	topics := strings.Split(values.Get("topics"), ",")

	v.Collections = collections
	v.Topics = topics

	return v.validate()
}

func (v *ValidateFilters) validate() error {
	if len(v.Collections) == 0 && len(v.Topics) == 0 {
		// TODO: Return an error
	}

	return nil
}
