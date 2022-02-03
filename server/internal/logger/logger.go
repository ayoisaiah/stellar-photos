package logger

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/nikoksr/notify"
	"github.com/nikoksr/notify/service/telegram"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/ayoisaiah/stellar-photos/internal/config"
)

var once sync.Once

var logger *zap.Logger

const (
	defaultTimeoutInSeconds = 10
)

type MyCore struct {
	zapcore.Core
}

// nolint:gocritic
func (c *MyCore) Check(
	entry zapcore.Entry,
	checked *zapcore.CheckedEntry,
) *zapcore.CheckedEntry {
	if c.Enabled(entry.Level) {
		return checked.AddCore(entry, c)
	}

	return checked
}

// nolint:gocritic
func (c *MyCore) Write(entry zapcore.Entry, fields []zapcore.Field) error {
	if entry.Level >= zapcore.WarnLevel {
		enc := zapcore.NewMapObjectEncoder()
		for _, f := range fields {
			f.AddTo(enc)
		}

		var str string

		for k, v := range enc.Fields {
			str += fmt.Sprintf("%s 👉 %v\n", k, v)
		}

		_ = notifyTelegram(
			entry.Message, str,
		)
	}

	return c.Core.Write(entry, fields)
}

func notifyTelegram(title, msg string) error {
	telegramService, err := telegram.New(config.Get().Telegram.Token)
	if err != nil {
		return err
	}

	chatID, err := strconv.Atoi(config.Get().Telegram.ChatID)
	if err != nil {
		return err
	}

	telegramService.AddReceivers(int64(chatID))

	notifier := notify.New()

	notifier.UseServices(telegramService)

	ctx, cancel := context.WithTimeout(
		context.Background(),
		defaultTimeoutInSeconds*time.Second,
	)

	defer cancel()

	return notifier.Send(ctx, title, msg)
}

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

		logger = zap.New(&MyCore{Core: core})
	})

	return logger.Sugar()
}
