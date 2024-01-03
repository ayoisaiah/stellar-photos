package health

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/fetch"
	"github.com/ayoisaiah/stellar-photos/internal/models"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

type Health struct {
	Checks      map[string]*Check `json:"checks,omitempty"`
	Version     string            `json:"version,omitempty"`
	ReleaseID   string            `json:"release_id,omitempty"`
	Output      string            `json:"output,omitempty"`
	Description string            `json:"description,omitempty"`
	Status      status            `json:"status,omitempty"`
	Notes       []string          `json:"notes,omitempty"`
}

type Check struct {
	Timestamp         time.Time         `json:"timestamp,omitempty"`
	ObservedValue     any               `json:"observed_value,omitempty"`
	ComponentName     string            `json:"component_name"`
	Status            status            `json:"status,omitempty"`
	ComponentID       string            `json:"component_id,omitempty"`
	ComponentType     string            `json:"component_type,omitempty"`
	ObservedUnit      string            `json:"observed_unit,omitempty"`
	MeasurementName   string            `json:"measurement_name,omitempty"`
	Output            string            `json:"output,omitempty"`
	AffectedEndpoints []string          `json:"affected_endpoints,omitempty"`
	Links             map[string]string `json:"links,omitempty"`
}

type status string

const (
	statusPass status = "pass"
	statusFail status = "fail"
	statusWarn status = "warn"
)

func newCheck(name string) *Check {
	var c Check
	c.Status = statusPass
	c.Timestamp = time.Now()
	c.ComponentName = name

	return &c
}

func liveCheck() *Health {
	var h Health
	h.Status = statusPass
	h.ReleaseID = utils.GitRevision
	h.Version = config.Version
	h.Description = "Liveness check"

	return &h
}

func healthResponse(w http.ResponseWriter, r *http.Request, h *Health) error {
	b, err := json.Marshal(&h)
	if err != nil {
		return err
	}

	return utils.JSONResponse(r.Context(), w, b)
}

func googleCheck(ctx context.Context) *Check {
	conf := config.Get()

	url := fmt.Sprintf(
		"%s/photos/random?collections=998309&client_id=%s",
		conf.Unsplash.BaseURL,
		conf.Unsplash.AccessKey,
	)

	photo := &models.UnsplashPhoto{}

	c := newCheck("Unsplash API")
	c.ComponentType = "api"

	start := time.Now()

	_, err := fetch.HTTPGet(ctx, url, photo)
	if err != nil {
		c.Output = err.Error()
		c.Status = statusFail
		c.Links["self"] = "https://status.unsplash.com/"
	}

	elapsedMs := time.Since(start).Milliseconds()

	if c.Status != statusPass {
		c.AffectedEndpoints = []string{
			"/unsplash/*",
			"/gdrive/save",
			"/dropbox/save",
		}
	}

	if c.Status == statusPass && elapsedMs > 1000 {
		c.Status = statusWarn
		c.Output = "Unsplash API response time is over one second"
	}

	c.ObservedValue = elapsedMs
	c.ObservedUnit = "ms"

	return c
}

func unsplashCheck(ctx context.Context) *Check {
	conf := config.Get()

	url := fmt.Sprintf(
		"%s/photos/random?collections=998309&client_id=%s",
		conf.Unsplash.BaseURL,
		conf.Unsplash.AccessKey,
	)

	photo := &models.UnsplashPhoto{}

	c := newCheck("Unsplash API")
	c.ComponentType = "api"

	start := time.Now()

	_, err := fetch.HTTPGet(ctx, url, photo)
	if err != nil {
		c.Output = err.Error()
		c.Status = statusFail
		c.Links["self"] = "https://status.unsplash.com/"
	}

	elapsedMs := time.Since(start).Milliseconds()

	if c.Status != statusPass {
		c.AffectedEndpoints = []string{
			"/unsplash/*",
			"/gdrive/save",
			"/dropbox/save",
		}
	}

	if c.Status == statusPass && elapsedMs > 1000 {
		c.Status = statusWarn
		c.Output = "Unsplash API response time is over one second"
	}

	c.ObservedValue = elapsedMs
	c.ObservedUnit = "ms"

	return c
}

// Live checks that the application can accept and respond to new TCP
// connections.
func Live(w http.ResponseWriter, r *http.Request) error {
	return healthResponse(w, r, liveCheck())
}

// Ready implements readiness checks.
func Ready(w http.ResponseWriter, r *http.Request) error {
	h := liveCheck()
	h.Description = "Readiness checks"

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)

	defer cancel()

	c := unsplashCheck(ctx)

	h.Checks = make(map[string]*Check)
	h.Checks["unsplash:response_time"] = c

	for _, v := range h.Checks {
		if v.Status != statusPass {
			h.Status = statusWarn
			break
		}
	}

	return healthResponse(w, r, h)
}
