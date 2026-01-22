package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/redis/go-redis/v9"
)

var Redis *redis.Client

// ConnectRedis initializes a global Redis client.
// If REDIS_ADDR is empty, Redis remains nil and features using it will be disabled.
func ConnectRedis() {
	addr := strings.TrimSpace(os.Getenv("REDIS_ADDR"))
	if addr == "" {
		log.Println("REDIS_ADDR not set, Redis features disabled")
		Redis = nil
		return
	}

	password := os.Getenv("REDIS_PASSWORD")
	db := 0
	if dbStr := strings.TrimSpace(os.Getenv("REDIS_DB")); dbStr != "" {
		if v, err := strconv.Atoi(dbStr); err == nil {
			db = v
		}
	}

	Redis = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
}

func GetRedis() *redis.Client {
	return Redis
}
