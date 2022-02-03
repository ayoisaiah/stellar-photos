package utils

import (
	"os"
	"strconv"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var once sync.Once

var logger *zap.Logger

// L initializes a zap logger once and returns it.
func L() *zap.SugaredLogger {
	once.Do(func() {
		logLevel := os.Getenv("LOG_LEVEL")
		logLevelInt, err := strconv.Atoi(logLevel)
		if err != nil {
			logLevelInt = int(zap.InfoLevel)
		}

		if logLevelInt > 5 || logLevelInt < -1 {
			logLevelInt = int(zap.InfoLevel)
		}

		stdout := zapcore.AddSync(os.Stdout)

		atom := zap.NewAtomicLevel()
		atom.SetLevel(zapcore.Level(logLevelInt))

		encoderCfg := zap.NewProductionEncoderConfig()
		encoderCfg.TimeKey = "timestamp"
		encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder

		core := zapcore.NewCore(
			zapcore.NewJSONEncoder(encoderCfg),
			stdout,
			atom,
		)

		logger = zap.New(core)
	})

	return logger.Sugar()
}
