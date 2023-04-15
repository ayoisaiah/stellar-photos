package health

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ayoisaiah/stellar-photos"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

type Health struct {
	Status      string            `json:"status,omitempty"`
	Version     string            `json:"version,omitempty"`
	GitRevision string            `json:"git_revision,omitempty"`
	Notes       []string          `json:"notes,omitempty"`
	Output      string            `json:"output,omitempty"`
	Description string            `json:"description,omitempty"`
	Checks      map[string]*Check `json:"checks,omitempty"`
}

type Check struct {
	ComponentName     string    `json:"component_name"`
	Status            string    `json:"status,omitempty"`
	MeasurementName   string    `json:"measurement_name,omitempty"`
	ComponentID       string    `json:"component_id,omitempty"`
	ComponentType     string    `json:"component_type,omitempty"`
	ObservedValue     any       `json:"observed_value,omitempty"`
	ObservedUnit      string    `json:"observed_unit,omitempty"`
	AffectedEndpoints []string  `json:"affected_endpoints,omitempty"`
	Time              time.Time `json:"time,omitempty"`
	Output            string    `json:"output,omitempty"`
}

func newCheck(name string) *Check {
	var c Check
	c.Status = "ok"
	c.Time = time.Now()
	c.ComponentName = name

	return &c
}

func newHealth() *Health {
	var h Health
	h.Status = "ok"
	h.GitRevision = utils.GetGitRevision()
	h.Version = "1"

	return &h
}

func healthResponse(w http.ResponseWriter, r *http.Request, h *Health) error {
	b, err := json.Marshal(&h)
	if err != nil {
		return err
	}

	return utils.JSONResponse(r.Context(), w, b)
}

func unsplashCheck(ctx context.Context) *Check {
	conf := config.Get()
	url := fmt.Sprintf(
		"%s/photos/random?collections=998309&client_id=%s",
		stellar.UnsplashAPIBaseURL,
		conf.Unsplash.AccessKey,
	)

	photo := &stellar.UnsplashPhoto{}

	c := newCheck("unsplash api")
	c.ComponentType = "api"
	c.AffectedEndpoints = []string{
		"/random-photo/",
		"/search-unsplash/",
		"/validate-collections/",
		"/download-photo/",
		"/googledrive/save/",
		"/dropbox/save/",
	}

	t := time.Now()

	_, err := utils.SendGETRequest(ctx, url, photo)
	if err != nil {
		c.Output = err.Error()
		c.Status = "fail"

		return c
	}

	c.ObservedValue = time.Since(t).Milliseconds()
	c.ObservedUnit = "ms"

	return c
}

// Live checks that the application can accept and respond to new TCP
// connections.
func Live(w http.ResponseWriter, r *http.Request) error {
	return healthResponse(w, r, newHealth())
}

// Ready implements readiness checks.
func Ready(w http.ResponseWriter, r *http.Request) error {
	h := newHealth()
	h.Description = "readiness checks"

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)

	defer cancel()

	c := unsplashCheck(ctx)

	h.Checks = make(map[string]*Check)
	h.Checks["unsplash"] = c

	return healthResponse(w, r, h)
}
