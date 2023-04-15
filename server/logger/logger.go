package logger

import (
	"context"
	"os"
	"runtime/debug"
	"strconv"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/ayoisaiah/stellar-photos/config"
)

const TraceLevel = zapcore.DebugLevel - 1

var once sync.Once

var defaultLogger *zap.Logger

type ctxKey struct{}

func NewDevZapLogger(lvl zapcore.LevelEnabler) *zap.Logger {
	encCfg := zap.NewDevelopmentEncoderConfig()
	encCfg.EncodeLevel = lowerCaseLevelEncoder
	zapCore := zapcore.NewCore(
		zapcore.NewConsoleEncoder(encCfg),
		zapcore.AddSync(os.Stderr),
		lvl,
	)

	return zap.New(zapCore)
}

func lowerCaseLevelEncoder(
	level zapcore.Level,
	enc zapcore.PrimitiveArrayEncoder,
) {
	if level == TraceLevel {
		enc.AppendString("trace")
		return
	}

	zapcore.LowercaseLevelEncoder(level, enc)
}

// L initializes a zap logger once and returns it.
func L() *zap.Logger {
	once.Do(func() {
		logLevel := config.Get().LogLevel
		logLevelInt, err := strconv.Atoi(logLevel)
		if err != nil {
			logLevelInt = int(zap.InfoLevel)
		}

		if logLevelInt > 5 || logLevelInt < -2 {
			logLevelInt = int(zap.InfoLevel)
		}

		stdout := zapcore.AddSync(os.Stdout)

		atom := zap.NewAtomicLevel()
		atom.SetLevel(zapcore.Level(logLevelInt))

		encoderCfg := zap.NewProductionEncoderConfig()
		encoderCfg.TimeKey = "timestamp"
		encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder
		encoderCfg.EncodeLevel = lowerCaseLevelEncoder

		core := zapcore.NewCore(
			zapcore.NewJSONEncoder(encoderCfg),
			stdout,
			atom,
		)

		var gitRevision string

		buildInfo, ok := debug.ReadBuildInfo()
		if ok {
			for _, v := range buildInfo.Settings {
				if v.Key == "vcs.revision" {
					gitRevision = v.Value
					break
				}
			}
		}

		defaultLogger = zap.New(core).With(
			zap.String("git_revision", gitRevision),
			zap.String("go_version", buildInfo.GoVersion),
			zap.Int("pid", os.Getpid()),
		)
	})

	return defaultLogger
}

// FromCtx returns the Logger associated with the ctx. If no logger
// is associated, the default logger is returned, unless it is nil
// in which case a disabled logger is returned.
func FromCtx(ctx context.Context) *zap.Logger {
	if l, ok := ctx.Value(ctxKey{}).(*zap.Logger); ok {
		return l
	} else if l := defaultLogger; l != nil {
		return l
	}

	return zap.NewNop()
}

func WithContext(ctx context.Context, l *zap.Logger) context.Context {
	if lp, ok := ctx.Value(ctxKey{}).(*zap.Logger); ok {
		if lp == l {
			// Do not store same logger.
			return ctx
		}
	}

	return context.WithValue(ctx, ctxKey{}, l)
}
