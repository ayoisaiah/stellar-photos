package logger

import (
	"context"
	"os"
	"strconv"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/ayoisaiah/stellar-photos/config"
)

var once sync.Once

var defaultLogger *zap.SugaredLogger

type ctxKey struct{}

// L initializes a zap logger once and returns it.
func L() *zap.SugaredLogger {
	once.Do(func() {
		logLevel := config.Get().LogLevel
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

		defaultLogger = zap.New(core).Sugar()
	})

	return defaultLogger
}

// FromCtx returns the Logger associated with the ctx. If no logger
// is associated, the default logger is returned, unless it is nil
// in which case a disabled logger is returned.
func FromCtx(ctx context.Context) *zap.SugaredLogger {
	if l, ok := ctx.Value(ctxKey{}).(*zap.SugaredLogger); ok {
		return l
	} else if l := defaultLogger; l != nil {
		return l
	}

	return zap.NewNop().Sugar()
}

func WithContext(ctx context.Context, l *zap.SugaredLogger) context.Context {
	if lp, ok := ctx.Value(ctxKey{}).(*zap.SugaredLogger); ok {
		if lp == l {
			// Do not store same logger.
			return ctx
		}
	}

	return context.WithValue(ctx, ctxKey{}, l)
}
