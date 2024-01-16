package stellar

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi"

	"github.com/ayoisaiah/stellar-photos/app"
	"github.com/ayoisaiah/stellar-photos/apperror"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/handler"
	"github.com/ayoisaiah/stellar-photos/health"
	"github.com/ayoisaiah/stellar-photos/internal/logger"
	"github.com/ayoisaiah/stellar-photos/middleware"
)

type Router struct {
	h *handler.Handler
}

const handlerTimeout = 60

func NewRouter() *Router {
	h := handler.NewHandler(app.NewApp())

	return &Router{
		h: &h,
	}
}

func NewHTTPServer() *http.Server {
	conf := config.Get()

	port := ":" + conf.Port

	mux := chi.NewRouter()

	s := NewRouter()

	mux.Use(middleware.CorrelationID)
	mux.Use(middleware.RequestLogger)
	mux.Use(middleware.Recover)

	mux.Route("/unsplash", func(r chi.Router) {
		r.Method(
			http.MethodGet,
			"/download",
			middleware.ErrorHandler(s.h.DownloadPhoto),
		)
		r.Method(
			http.MethodGet,
			"/search",
			middleware.ErrorHandler(s.h.SearchPhotos),
		)
		r.Method(
			http.MethodGet,
			"/random",
			middleware.ErrorHandler(s.h.GetRandomPhoto),
		)
		r.Method(
			http.MethodGet,
			"/validate",
			middleware.ErrorHandler(s.h.ValidateFilters),
		)
	})

	mux.Route("/gdrive", func(r chi.Router) {
		r.Method(
			http.MethodGet,
			"/key",
			middleware.ErrorHandler(s.h.SendGoogleDriveKey),
		)
		r.Method(
			http.MethodPost,
			"/auth",
			middleware.ErrorHandler(s.h.AuthorizeGoogleDrive),
		)
		r.Method(
			http.MethodPost,
			"/refresh",
			middleware.ErrorHandler(s.h.RefreshGoogleDriveToken),
		)
		r.Method(
			http.MethodPost,
			"/save",
			middleware.ErrorHandler(s.h.SaveToGoogleDrive),
		)
	})

	mux.Route("/dropbox", func(r chi.Router) {
		r.Method(
			http.MethodGet,
			"/key",
			middleware.ErrorHandler(s.h.SendDropboxKey),
		)
		r.Method(
			http.MethodPost,
			"/save",
			middleware.ErrorHandler(s.h.SaveToDropbox),
		)
	})

	mux.Route("/onedrive", func(r chi.Router) {
		r.Method(
			http.MethodGet,
			"/id",
			middleware.ErrorHandler(s.h.SendOneDriveID),
		)
		r.Method(
			http.MethodPost,
			"/auth",
			middleware.ErrorHandler(s.h.AuthorizeOneDrive),
		)
		r.Method(
			http.MethodPost,
			"/refresh",
			middleware.ErrorHandler(s.h.RefreshOneDriveToken),
		)
		r.Method(
			http.MethodPost,
			"/save",
			middleware.ErrorHandler(s.h.SaveToOneDrive),
		)
	})

	mux.Route("/health", func(r chi.Router) {
		r.Method(http.MethodGet, "/live", middleware.ErrorHandler(health.Live))
		r.Method(
			http.MethodGet,
			"/ready",
			middleware.ErrorHandler(health.Ready),
		)
	})

	mux.NotFound(middleware.ErrorHandler(
		func(w http.ResponseWriter, r *http.Request) error {
			return apperror.ErrNotFound
		}).ServeHTTP)

	srv := &http.Server{
		Addr: port,
		Handler: http.TimeoutHandler(
			mux,
			handlerTimeout*time.Second,
			"request timed out",
		),
		ReadTimeout: 5 * time.Second,
		ErrorLog:    slog.NewLogLogger(logger.Handler, slog.LevelInfo),
	}

	return srv
}
