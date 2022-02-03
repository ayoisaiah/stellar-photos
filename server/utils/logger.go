package utils

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

	"github.com/ayoisaiah/stellar-photos-server/config"
)

var once sync.Once

var logger *zap.Logger

func notifyTelegram(msg string) error {
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

	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeoutInSeconds*time.Second)

	defer cancel()

	return notifier.Send(ctx, "", msg)
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

		logger = zap.New(core).WithOptions(zap.Hooks(func(entry zapcore.Entry) error {
			if entry.Level < zapcore.WarnLevel {
				return nil
			}

			_ = notifyTelegram(fmt.Sprintf("[Stellar Photos]: %s", entry.Message))

			return nil
		}))
	})

	return logger.Sugar()
}
