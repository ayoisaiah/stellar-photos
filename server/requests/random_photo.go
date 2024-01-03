package requests

import (
	"net/http"
	"slices"
	"strings"

	"github.com/ayoisaiah/stellar-photos/config"
)

// RandomPhoto represents a request to retrieve a random image from Unsplash.
type RandomPhoto struct {
	Collections   string `json:"collections"`
	Resolution    string `json:"resolution"`
	Topics        string `json:"topics"`
	Username      string `json:"username"`
	Orientation   string `json:"orientation"`
	ContentFilter string `json:"content_filter"`
	Query         string `json:"query"`
}

const (
	OrientationLandscape = "landscape"
	OrientationPortrait  = "portrait"
	OrientationSquarish  = "squarish"
)

const (
	FilterLow  = "low"
	FilterHigh = "high"
)

const (
	ResolutionStandard = "standard"
	ResolutionHigh     = "high"
	ResolutionMax      = "max"
)

var (
	resolutions  = []string{ResolutionStandard, ResolutionHigh, ResolutionMax}
	orientations = []string{
		OrientationLandscape,
		OrientationPortrait,
		OrientationSquarish,
	}
)

func (p *RandomPhoto) Init(r *http.Request) error {
	values, err := getURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	collections := strings.TrimSpace(values.Get("collections"))

	resolution := strings.TrimSpace(values.Get("resolution"))

	topics := strings.TrimSpace(values.Get("topics"))
	query := strings.TrimSpace(values.Get("query"))

	filter := strings.TrimSpace(values.Get("content_filter"))

	orientation := strings.TrimSpace(values.Get("orientation"))

	p.Collections = collections
	p.Resolution = resolution
	p.Topics = topics
	p.Query = query
	p.Orientation = orientation
	p.ContentFilter = filter

	return p.validate()
}

func (p *RandomPhoto) validate() error {
	conf := config.Get()

	if p.Collections == p.Topics && p.Topics == p.Query && p.Query == "" {
		p.Collections = conf.Unsplash.DefaultCollection
	}

	if p.ContentFilter != FilterHigh && p.ContentFilter != FilterLow {
		p.ContentFilter = FilterLow
	}

	if !slices.Contains(orientations, p.Orientation) {
		p.Orientation = OrientationLandscape
	}

	if !slices.Contains(resolutions, p.Resolution) {
		p.Resolution = ResolutionStandard
	}

	return nil
}
