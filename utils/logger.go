package utils

import (
	"os"
	"strconv"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var once sync.Once

func Logger() *zap.SugaredLogger {
	once.Do(func() {
		logLevel := os.Getenv("LOG_LEVEL")
		logLevelInt, err := strconv.Atoi(logLevel)
		if err != nil {
			logLevelInt = int(zap.InfoLevel)
		}

		if logLevelInt > 5 || logLevelInt < -1 {
			logLevelInt = int(zap.InfoLevel)
		}

		w := zapcore.AddSync(&lumberjack.Logger{
			Filename:   "logs/app.log",
			MaxSize:    5,
			MaxBackups: 30,
			MaxAge:     28,
		})

		stdout := zapcore.AddSync(os.Stdout)

		out := zapcore.NewMultiWriteSyncer(w, stdout)

		atom := zap.NewAtomicLevel()
		atom.SetLevel(zapcore.Level(logLevelInt))

		encoderCfg := zap.NewProductionEncoderConfig()
		encoderCfg.TimeKey = "timestamp"
		encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder

		core := zapcore.NewCore(
			zapcore.NewJSONEncoder(encoderCfg),
			out,
			atom,
		)

		zap.New(core).WithOptions()
		zap.ReplaceGlobals(zap.New(core))
	})

	return zap.L().Sugar()
}
