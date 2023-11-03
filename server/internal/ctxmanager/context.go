// ctxmanager manages context keys used throuhgout the application
package ctxmanager

type CtxKey string

const (
	// CorrelationIDKey is represents a requests correlation ID.
	CorrelationIDKey CtxKey = "correlation_id"
	DownloadCtxKey   CtxKey = "download"
)
