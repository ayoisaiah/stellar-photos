package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
	"runtime/debug"
	"strconv"
	"sync"

	"github.com/charmbracelet/log"

	"github.com/ayoisaiah/stellar-photos/config"
)

const (
	LevelTrace = slog.Level(-8)
	LevelFatal = slog.Level(12)
)

var LevelNames = map[slog.Leveler]string{
	LevelTrace: "TRACE",
	LevelFatal: "FATAL",
}

var once sync.Once

var defaultLogger *slog.Logger

type ctxKey struct{}

// L initializes a Slog logger once and returns it.
func L() *slog.Logger {
	once.Do(func() {
		conf := config.Get()

		var handler slog.Handler

		levelInt, _ := strconv.Atoi(conf.LogLevel)

		logLevel := &slog.LevelVar{}
		logLevel.Set(slog.Level(levelInt))

		opts := &slog.HandlerOptions{
			AddSource: true,
			Level:     logLevel,
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				if a.Key == slog.LevelKey {
					level, _ := a.Value.Any().(slog.Level)

					label, exists := LevelNames[level]

					if !exists {
						label = level.String()
					}

					a.Value = slog.StringValue(label)
				}

				return a
			},
		}

		handler = slog.NewJSONHandler(os.Stdout, opts)

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

		if conf.GoEnv == config.EnvDevelopment {
			handler = log.New(os.Stdout)
		}

		defaultLogger = slog.New(handler)

		if conf.GoEnv == config.EnvProduction {
			defaultLogger = defaultLogger.With(
				slog.Int("pid", os.Getpid()),
				slog.String("go_version", buildInfo.GoVersion),
				slog.String("git_revision", gitRevision),
			)
		}
	})

	return defaultLogger
}

// Ctx returns the Logger associated with the ctx. If no logger
// is associated, the default logger is returned, unless it is nil
// in which case a disabled logger is returned.
func Ctx(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		return l
	} else if l := defaultLogger; l != nil {
		return l
	}

	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func WithContext(ctx context.Context, l *slog.Logger) context.Context {
	if lp, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		if lp == l {
			// Do not store same logger.
			return ctx
		}
	}

	return context.WithValue(ctx, ctxKey{}, l)
}
