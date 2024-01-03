package logger

import (
	"context"
	"log/slog"
	"os"
	"runtime/debug"
	"strconv"
	"sync"

	"github.com/lmittmann/tint"

	"github.com/ayoisaiah/stellar-photos/apperror"
	"github.com/ayoisaiah/stellar-photos/config"
	"github.com/ayoisaiah/stellar-photos/internal/ctxmanager"
)

type ContextHandler struct {
	slog.Handler
}

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

func replaceAttr(_ []string, a slog.Attr) slog.Attr {
	if a.Key == slog.LevelKey {
		level, _ := a.Value.Any().(slog.Level)

		label, exists := LevelNames[level]

		if !exists {
			label = level.String()
		}

		a.Value = slog.StringValue(label)
	}

	switch a.Value.Kind() {
	case slog.KindAny:
		switch v := a.Value.Any().(type) {
		case error:
			a.Value = apperror.FmtErr(v)
		}
	}

	return a
}

// Handle adds contextual attributes to the Record before calling the underlying
// handler.
func (h ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if attrs, ok := ctx.Value(ctxmanager.SlogCtxKey).([]slog.Attr); ok {
		for _, v := range attrs {
			r.AddAttrs(v)
		}
	}

	return h.Handler.Handle(ctx, r)
}

// AppendCtx adds an slog attribute to the provided context so that it will be
// included in any Record created with such context.
func AppendCtx(parent context.Context, attr slog.Attr) context.Context {
	if parent == nil {
		parent = context.Background()
	}

	if v, ok := parent.Value(ctxmanager.SlogCtxKey).([]slog.Attr); ok {
		v = append(v, attr)
		return context.WithValue(parent, ctxmanager.SlogCtxKey, v)
	}

	v := []slog.Attr{}
	v = append(v, attr)
	return context.WithValue(parent, ctxmanager.SlogCtxKey, v)
}

var Handler slog.Handler

// L initializes a Slog logger once and returns it.
func L() *slog.Logger {
	once.Do(func() {
		conf := config.Get()

		levelInt, _ := strconv.Atoi(conf.LogLevel)

		logLevel := &slog.LevelVar{}
		logLevel.Set(slog.Level(levelInt))

		opts := &slog.HandlerOptions{
			AddSource:   true,
			Level:       logLevel,
			ReplaceAttr: replaceAttr,
		}

		jsonHandler := slog.NewJSONHandler(os.Stdout, opts)

		h := &ContextHandler{jsonHandler}

		Handler = h

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
			Handler = &ContextHandler{tint.NewHandler(os.Stdout, nil)}
		}

		defaultLogger = slog.New(Handler)

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
