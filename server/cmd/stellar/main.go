package main

import (
	"log/slog"
	"os"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"

	"github.com/ayoisaiah/stellar-photos"
	"github.com/ayoisaiah/stellar-photos/cache"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/logger"
)

func run() error {
	// Ignore error if `.env` file is not found since env variables
	// may be injected in some other way
	_ = godotenv.Load()

	l := logger.L()

	slog.SetDefault(l)

	conf := config.Get()

	srv := stellar.NewHTTPServer()

	if conf.GoEnv == config.EnvProduction {
		go func() {
			cache.Photos()

			c := cron.New()

			_, err := c.AddFunc("@daily", func() {
				cache.Photos()
			})
			if err != nil {
				slog.Error("unable to schedule cron job",
					slog.Any("error", err),
				)
			}

			c.Start()
		}()
	}

	slog.Info(
		"Stellar Photos server is listening on port: " + srv.Addr,
	)

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		slog.Error("server startup failed", slog.Any("error", err))
		os.Exit(1)
	}
}
