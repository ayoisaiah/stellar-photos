package stellar

import (
	"go.uber.org/zap"

	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/logger"
)

type App struct {
	Config *config.Config
	L      *zap.SugaredLogger
}

func NewApp() *App {
	return &App{
		L:      logger.L(),
		Config: config.Get(),
	}
}
