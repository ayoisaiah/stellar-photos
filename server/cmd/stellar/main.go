package main

import (
	"log"
	"log/slog"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"

	"github.com/ayoisaiah/stellar-photos"
	"github.com/ayoisaiah/stellar-photos/cache"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/logger"
)

func run() error {
	// Ignore error if `.env` file is not found since env variables
	// may be injected in some other way
	_ = godotenv.Load()

	l := logger.L()

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
				l.Error("unable to schedule cron job",
					slog.Any("error", err),
				)
			}

			c.Start()
		}()
	}

	l.Info(
		"Stellar Photos Server is listening on port: " + srv.Addr,
	)

	return srv.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
