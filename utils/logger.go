package utils

import (
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var once sync.Once

func Logger() *zap.SugaredLogger {
	once.Do(func() {
		w := zapcore.AddSync(&lumberjack.Logger{
			Filename:   "logs/app.log",
			MaxSize:    5,
			MaxBackups: 30,
			MaxAge:     28,
		})

		stdout := zapcore.AddSync(os.Stdout)

		out := zapcore.NewMultiWriteSyncer(w, stdout)

		atom := zap.NewAtomicLevel()
		atom.SetLevel(zap.InfoLevel)

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
