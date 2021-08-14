package utils

import (
	"context"
	"log"
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

var ttl = time.Hour * 6
var redisTimeout = 5 * time.Second

// GetImageBase64 implements read-through caching in which the image's
// base64 string is retrieved from the cache first or the network if
// not found in the cache
func GetImageBase64(url, key string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), redisTimeout)

	defer cancel()

	base64, err := rdb.Get(ctx, key).Result()
	if err == nil {
		// Sliding expiration based on last access
		err = rdb.Expire(ctx, key, ttl).Err()
		if err != nil {
			log.Println(err)
		}

		log.Printf("CACHE HIT: %s retrieved from cache", url)
		return base64, nil
	}

	if err != nil {
		log.Println(err)
	}

	base64, err = imageURLToBase64(url)
	if err != nil {
		return "", err
	}

	log.Printf("CACHE MISS: %s retrieved from network", url)

	err = rdb.Set(ctx, key, base64, ttl).Err()
	if err != nil {
		log.Println(err)
	}

	return base64, nil
}
