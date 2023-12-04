package requests

import "net/url"

// getURLQueryParams extracts the query parameters from a url string and returns
// a map of strings.
func getURLQueryParams(s string) (url.Values, error) {
	u, err := url.Parse(s)
	if err != nil {
		return nil, err
	}

	query := u.Query()

	return query, nil
}
