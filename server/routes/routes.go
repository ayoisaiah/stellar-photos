package routes

import (
	"net/http"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-chi/cors"

	"github.com/ayoisaiah/stellar-photos/app"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/handler"
	"github.com/ayoisaiah/stellar-photos/middleware"
)

const handlerTimeout = 60

type Router struct {
	h *handler.Handler
}

var s *Router

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

	// TODO: Manage CORS in Caddy
	mux.Use(cors.Handler(cors.Options{}))
	mux.Use(middleware.CtxLogger)
	mux.Use(middleware.RequestID)
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
			"/collections",
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
			http.MethodGet,
			"/auth",
			middleware.ErrorHandler(s.h.AuthorizeGoogleDrive),
		)
		r.Method(
			http.MethodGet,
			"/refresh",
			middleware.ErrorHandler(s.h.RefreshGoogleDriveToken),
		)

		r.Method(
			http.MethodGet,
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
			http.MethodGet,
			"/save",
			middleware.ErrorHandler(s.h.SaveToDropbox),
		)
	})

	mux.Route("/onedrive", func(r chi.Router) {
		r.Method(
			http.MethodGet,
			"/id",
			middleware.ErrorHandler(s.h.SendOnedriveID),
		)
		r.Method(
			http.MethodGet,
			"/auth",
			middleware.ErrorHandler(s.h.AuthorizeOnedrive),
		)
		r.Method(
			http.MethodGet,
			"/refresh",
			middleware.ErrorHandler(s.h.RefreshOnedriveToken),
		)
	})

	// TODO: Review server options
	srv := &http.Server{
		Addr: port,
		Handler: http.TimeoutHandler(
			mux,
			handlerTimeout*time.Second,
			"request timed out",
		),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       5 * time.Second,
	}

	return srv
}
