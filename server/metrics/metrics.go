package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

type Prometheus struct {
	ResolutionCount  *prometheus.CounterVec
	OrientationCount *prometheus.CounterVec
	UserAgent        *prometheus.CounterVec
	CacheOrNetwork   *prometheus.CounterVec
	ErrorCount       *prometheus.CounterVec
	CloudUploads     *prometheus.CounterVec
}

const namespace = "stellar"

var M *Prometheus

func init() {
	M = &Prometheus{
		ResolutionCount: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "resolution_count_total",
				Help:      "Tracking requested image resolutions",
			},
			[]string{"resolution"},
		),
		OrientationCount: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "orientation_count_total",
				Help:      "Tracking requested image orientations",
			},
			[]string{"orientation"},
		),
		UserAgent: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "user_agent_total",
				Help:      "Tracking user agent",
			},
			[]string{"browser"},
		),
		ErrorCount: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "count_total",
				Help:      "Track error count",
			},
			[]string{"path"},
		),
		CacheOrNetwork: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "cache_or_network_total",
				Help:      "Track if image is searved from cache or network",
			},
			[]string{"location"},
		),
		CloudUploads: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "cloud_uploads_total",
				Help:      "Track the number of cloud uploads",
			},
			[]string{"service"},
		),
	}
}

func Reg() *prometheus.Registry {
	reg := prometheus.NewRegistry()
	reg.MustRegister(collectors.NewGoCollector())

	reg.MustRegister(
		M.OrientationCount,
		M.ResolutionCount,
		M.ErrorCount,
		M.CloudUploads,
		M.UserAgent,
		M.CacheOrNetwork,
	)

	return reg
}
