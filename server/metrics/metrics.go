package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

type Prometheus struct {
	TotalRequests   *prometheus.CounterVec
	ResolutionCount *prometheus.CounterVec
	RequestDuration *prometheus.SummaryVec
	ImageDownload   *prometheus.CounterVec
	UserAgent       *prometheus.CounterVec
	CacheOrNetwork  *prometheus.CounterVec
	ErrorCount      *prometheus.CounterVec
}

var m *Prometheus

func Init() *prometheus.Registry {
	reg := prometheus.NewRegistry()
	reg.MustRegister(collectors.NewGoCollector())

	m = &Prometheus{
		TotalRequests: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Track number of requests",
			},
			[]string{"path"},
		),
		ResolutionCount: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "image_resolution_count_total",
				Help: "Tracking requested image resolutions",
			},
			[]string{"resolution"},
		),
		RequestDuration: prometheus.NewSummaryVec(
			prometheus.SummaryOpts{
				Name: "http_request_duration_seconds",
				Help: "Duration of requests",
			},
			[]string{"path"},
		),
		ImageDownload: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "image_download_count_total",
				Help: "Tracking downloaded images",
			},

			[]string{"download_ctx"},
		),
		UserAgent: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "user_agent_total",
				Help: "Tracking user agent",
			},
			[]string{"browser"},
		),
		ErrorCount: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "error_count_total",
				Help: "Track error count",
			},
			[]string{},
		),
		CacheOrNetwork: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "cache_or_network_total",
				Help: "Track if image is searved from cache or network",
			},
			[]string{"location"},
		),
	}

	reg.MustRegister(
		m.TotalRequests,
		m.ResolutionCount,
		m.RequestDuration,
		m.ImageDownload,
		m.UserAgent,
		m.CacheOrNetwork,
	)

	return reg
}

func Get() *Prometheus {
	if m == nil {
		Init()
	}

	return m
}
