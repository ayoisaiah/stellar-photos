package utils

import (
	"context"
	"errors"
	"time"

	"github.com/go-redis/redis/v8"
)

type Redis interface {
	Get(context.Context, string) *redis.StringCmd
	Set(context.Context, string, interface{}, time.Duration) *redis.StatusCmd
	Expire(context.Context, string, time.Duration) *redis.BoolCmd
}

var rdb Redis

func InitRedis(r Redis) {
	rdb = r
}

var redisTimeout = 5 * time.Second

var ttl = time.Hour * 12

// GetImageBase64 implements read-through caching in which the image's
// base64 string is retrieved from the cache first or the network if
// not found in the cache.
func GetImageBase64(url, key string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), redisTimeout)

	defer cancel()

	base64, err := rdb.Get(ctx, key).Result()
	if err == nil {
		// Sliding expiration based on last access
		err = rdb.Expire(ctx, key, ttl).Err()
		if err != nil {
			Logger().Errorw("Unable to set new expiration time", "tag", "sliding_expiration", "key", key, "error", err)
		}

		Logger().Infow("Image was successfully retrieved from the cache", "tag", "cache_hit", "key", key)

		return base64, nil
	}

	if err != nil && !errors.Is(err, redis.Nil) {
		Logger().Errorw("Error occurred while fetching value from Redis", "tag", "redis_get_error", "key", key, "error", err)
	}

	Logger().Infow("Image about to be retrieved from the network", "tag", "cache_miss", "key", key)

	base64, err = imageURLToBase64(url)
	if err != nil {
		return "", err
	}

	ctx, cancel = context.WithTimeout(context.Background(), redisTimeout)

	defer cancel()

	err = rdb.Set(ctx, key, base64, ttl).Err()
	if err != nil {
		Logger().Errorw("Error occurred while setting key in Redis", "tag", "redis_set_error", "key", key, "error", err)
	}

	return base64, nil
}
