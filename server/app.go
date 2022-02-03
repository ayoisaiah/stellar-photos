package stellar

import (
	"go.uber.org/zap"

	"github.com/ayoisaiah/stellar-photos/internal/config"
	"github.com/ayoisaiah/stellar-photos/internal/logger"
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
